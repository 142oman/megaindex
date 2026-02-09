const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const lodashId = require('lodash-id');
const pLimit = require('p-limit');
const puppeteer = require('puppeteer');

const adapter = new FileSync('db.json');
const db = low(adapter);
db._.mixin(lodashId);

// Initialize DB
db.defaults({ library: [], queue: [] }).write();

const app = express();
app.use(express.json());
app.use(express.static('public'));

// Scraper Logic
async function resolveRedirect(browser, url) {
    let page;
    try {
        page = await browser.newPage();
        // Block heavy resources to speed up loading
        await page.setRequestInterception(true);
        page.on('request', (req) => {
            if (['image', 'stylesheet', 'font', 'media'].includes(req.resourceType())) {
                req.abort();
            } else {
                req.continue();
            }
        });

        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });

        // Wait for the URL to change from the original
        try {
            await page.waitForFunction((oldUrl) => window.location.href !== oldUrl, { timeout: 5000 }, url);
        } catch (e) {
            // If it didn't change, it might be a fast redirect or no redirect
        }

        const finalUrl = page.url();
        await page.close();
        return finalUrl;
    } catch (e) {
        console.error(`Error resolving redirect for ${url}:`, e.message);
        if (page) await page.close();
        return url;
    }
}

async function scrapeEpisodeLinks(browser, episodeUrl) {
    try {
        const { data } = await axios.get(episodeUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        const $ = cheerio.load(data);
        const downloadLinks = [];

        $('#mdl-download tbody tr').each((i, el) => {
            downloadLinks.push({
                server: $(el).find('td').eq(0).text().trim(),
                lang: $(el).find('td').eq(1).text().trim(),
                quality: $(el).find('td').eq(2).text().trim(),
                redirectLink: $(el).find('td').eq(3).find('a').attr('href')
            });
        });

        // Resolve all links for THIS episode in parallel
        await Promise.all(downloadLinks.map(async (link) => {
            if (link.redirectLink) {
                link.finalLink = await resolveRedirect(browser, link.redirectLink);
            }
        }));

        return downloadLinks;
    } catch (e) {
        console.error(`Error scraping episode ${episodeUrl}:`, e.message);
        return [];
    }
}

// Background Worker logic
let isProcessing = false;

async function processQueue() {
    if (isProcessing) return;

    const task = db.get('queue').find({ status: 'pending' }).value();
    if (!task) return;

    isProcessing = true;
    db.get('queue').find({ id: task.id }).assign({ status: 'processing', startedAt: Date.now() }).write();

    let browser;
    try {
        browser = await puppeteer.launch({
            headless: "new",
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const { url } = task;
        const { data } = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        const $ = cheerio.load(data);
        const isSeries = url.includes('/series/') || url.includes('/episode/');
        const isMovie = url.includes('/movies/');

        let title = $('h1').text().trim();
        let poster = $('img[alt^="Image"]').first().attr('data-src') || $('img[alt^="Image"]').first().attr('src');
        if (poster && poster.startsWith('//')) poster = 'https:' + poster;

        db.get('queue').find({ id: task.id }).assign({ title, poster }).write();

        if (isMovie) {
            const links = await scrapeEpisodeLinks(browser, url);
            const item = {
                type: 'movie',
                title,
                poster,
                url,
                links,
                timestamp: Date.now()
            };
            db.get('library').insert(item).write();
        } else if (isSeries) {
            let postID;
            const scriptContent = $('script').text();
            const match = scriptContent.match(/"postID":(\d+)/);
            if (match) postID = match[1];
            if (!postID) postID = $('.season-btn').first().attr('data-post');

            if (!postID) throw new Error('Could not find postID for series');

            const seasonsData = [];
            const seasonButtons = $('.season-btn');

            // First pass: gather all episode URLs to know the total count
            const allEpisodesToScrape = [];
            for (let i = 0; i < seasonButtons.length; i++) {
                const btn = $(seasonButtons[i]);
                const seasonNum = btn.attr('data-season');
                const ajaxUrl = `https://animesalt.top/wp-admin/admin-ajax.php?action=action_select_season&season=${seasonNum}&post=${postID}`;
                const { data: episodesHtml } = await axios.get(ajaxUrl);
                const $ep = cheerio.load(episodesHtml);

                $ep('li').each((j, el) => {
                    allEpisodesToScrape.push({
                        seasonNum,
                        seasonName: btn.text().trim(),
                        epTitle: $ep(el).find('.entry-title').text().trim(),
                        epUrl: $ep(el).find('a.lnk-blk').attr('href'),
                        epNum: $ep(el).find('.num-epi').text().trim()
                    });
                });
            }

            const totalEpisodes = allEpisodesToScrape.length;
            const seasons = {};
            let startTime = Date.now();

            for (let i = 0; i < totalEpisodes; i++) {
                const ep = allEpisodesToScrape[i];
                console.log(`  Scraping Episode ${i + 1}/${totalEpisodes}: ${ep.epTitle}`);

                const links = await scrapeEpisodeLinks(browser, ep.epUrl);

                if (!seasons[ep.seasonNum]) {
                    seasons[ep.seasonNum] = {
                        number: ep.seasonNum,
                        name: ep.seasonName,
                        episodes: []
                    };
                }

                seasons[ep.seasonNum].episodes.push({
                    number: ep.epNum,
                    title: ep.epTitle,
                    url: ep.epUrl,
                    links
                });

                // Update progress & ETA
                const elapsed = Date.now() - startTime;
                const avgTimePerEp = elapsed / (i + 1);
                const remainingEps = totalEpisodes - (i + 1);
                const etaSeconds = Math.round((remainingEps * avgTimePerEp) / 1000);

                db.get('queue').find({ id: task.id }).assign({
                    progress: Math.round(((i + 1) / totalEpisodes) * 100),
                    eta: etaSeconds > 0 ? `${Math.floor(etaSeconds / 60)}m ${etaSeconds % 60}s` : 'Finishing...'
                }).write();
            }

            const item = {
                type: 'series',
                title,
                poster,
                url,
                seasons: Object.values(seasons),
                timestamp: Date.now()
            };
            db.get('library').insert(item).write();
        }

        db.get('queue').find({ id: task.id }).assign({ status: 'completed', progress: 100, completedAt: Date.now() }).write();
    } catch (e) {
        console.error('Task failed:', task.id, e.message);
        db.get('queue').find({ id: task.id }).assign({ status: 'failed', error: e.message }).write();
    } finally {
        if (browser) await browser.close();
        isProcessing = false;
        // Check for next task
        setTimeout(processQueue, 1000);
    }
}

// Endpoints
app.post('/api/scrape', (req, res) => {
    const { url } = req.body;
    if (!url) return res.status(400).send('URL is required');

    // Check if already in queue or library
    const inLibrary = db.get('library').find({ url }).value();
    const inQueue = db.get('queue').filter(t => t.url === url && (t.status === 'pending' || t.status === 'processing')).value();

    if (inLibrary || inQueue.length > 0) {
        return res.status(400).send('URL already in library or queue');
    }

    const task = {
        url,
        status: 'pending',
        progress: 0,
        timestamp: Date.now()
    };
    const savedTask = db.get('queue').insert(task).write();

    // Start processor if not running
    processQueue();

    res.json(savedTask);
});

app.get('/api/queue', (req, res) => {
    res.json(db.get('queue').value());
});

app.delete('/api/queue/:id', (req, res) => {
    db.get('queue').remove({ id: req.params.id }).write();
    res.sendStatus(200);
});

app.get('/api/library', (req, res) => {
    res.json(db.get('library').value());
});

app.delete('/api/library/:id', (req, res) => {
    db.get('library').remove({ id: req.params.id }).write();
    res.sendStatus(200);
});

// --- BROADCAST API V1 ---
/**
 * GET /api/v1/shows
 * Returns a list of all series and movies with basic metadata.
 */
app.get('/api/v1/shows', (req, res) => {
    const list = db.get('library').value().map(item => ({
        id: item.id,
        title: item.title,
        type: item.type,
        poster: item.poster,
        addedAt: item.timestamp,
        seasonCount: item.type === 'series' ? item.seasons.length : 0
    }));
    res.json(list);
});

/**
 * GET /api/v1/shows/:id
 * Returns full details including all episode download links for a specific show.
 */
app.get('/api/v1/shows/:id', (req, res) => {
    const show = db.get('library').find({ id: req.params.id }).value();
    if (!show) return res.status(404).json({ error: 'Show not found' });
    res.json(show);
});

/**
 * GET /api/v1/search
 * Query parameter: q (title search)
 */
app.get('/api/v1/search', (req, res) => {
    const query = (req.query.q || '').toLowerCase();
    const results = db.get('library')
        .filter(item => item.title.toLowerCase().includes(query))
        .value();
    res.json(results);
});

/**
 * POST /api/v1/ingest
 * Allows external systems to request a new scrape.
 */
app.post('/api/v1/ingest', (req, res) => {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'URL required' });

    // Use the existing scrape logic
    const task = {
        url,
        status: 'pending',
        progress: 0,
        source: 'api_v1',
        timestamp: Date.now()
    };
    db.get('queue').insert(task).write();
    processQueue();
    res.status(202).json({ message: 'Ingestion task created', taskId: task.id });
});

const PORT = 4000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    // Clear any stuck processing tasks
    db.get('queue').filter({ status: 'processing' }).forEach(t => {
        db.get('queue').find({ id: t.id }).assign({ status: 'pending' }).write();
    }).write();
    // Check for pending tasks on startup
    processQueue();
});
