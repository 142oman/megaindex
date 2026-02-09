const urlInput = document.getElementById('urlInput');
const addBtn = document.getElementById('addBtn');
const libraryGrid = document.getElementById('libraryGrid');
const statusDiv = document.getElementById('status');
const detailModal = document.getElementById('detailModal');
const modalBody = document.getElementById('modalBody');
const closeModal = document.querySelector('.close-modal');
const queueSection = document.getElementById('queueSection');
const queueList = document.getElementById('queueList');

let libraryData = [];
let queueData = [];

async function loadData() {
    try {
        const [libRes, queueRes] = await Promise.all([
            fetch('/api/library'),
            fetch('/api/queue')
        ]);

        const newLibData = await libRes.json();
        const newQueueData = await queueRes.json();

        // Only re-render library if it changed to avoid flickering during selection
        if (JSON.stringify(newLibData) !== JSON.stringify(libraryData)) {
            libraryData = newLibData;
            renderLibrary();
        }

        queueData = newQueueData;
        renderQueue();
    } catch (e) {
        console.error('Failed to load data', e);
    }
}

function renderLibrary() {
    libraryGrid.innerHTML = libraryData.map(item => `
        <div class="item-card" onclick="showDetails('${item.id}')">
            <button class="delete-btn" onclick="deleteItem(event, '${item.id}')">
                <i class="fas fa-trash"></i>
            </button>
            <div class="poster-box">
                <img src="${item.poster || 'https://via.placeholder.com/200x300'}" alt="${item.title}">
            </div>
            <div class="item-info">
                <span class="item-type">${item.type}</span>
                <h3 class="item-title">${item.title}</h3>
                <span class="item-meta">
                    ${item.type === 'series' ? item.seasons.length + ' Seasons' : 'Movie'}
                </span>
            </div>
        </div>
    `).join('');
}

function renderQueue() {
    // Show queue section only if there are pending or processing tasks
    const activeTasks = queueData.filter(t => t.status === 'pending' || t.status === 'processing');

    if (activeTasks.length > 0) {
        queueSection.style.display = 'block';
        queueList.innerHTML = activeTasks.map(task => `
            <div class="queue-item">
                <div class="queue-item-info">
                    <div class="queue-item-title">${task.title || task.url}</div>
                    <div style="display: flex; align-items: center; gap: 1rem;">
                        <span class="queue-badge badge-${task.status}">${task.status}</span>
                        ${task.status === 'processing' ? `
                            <div class="queue-progress-container">
                                <div class="queue-progress-bar" style="width: ${task.progress}%"></div>
                            </div>
                            <span style="font-size: 0.8rem; color: var(--text-dim); min-width: 40px;">${task.progress}%</span>
                            ${task.eta ? `<span style="font-size: 0.8rem; color: var(--primary-light); font-weight: 600;">ETA: ${task.eta}</span>` : ''}
                        ` : ''}
                    </div>
                </div>
                <button class="btn" style="background: rgba(255,255,255,0.05); padding: 0.5rem; border-radius: 0.5rem;" onclick="deleteQueueItem('${task.id}')">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `).join('');
    } else {
        queueSection.style.display = 'none';
    }
}

async function deleteQueueItem(id) {
    await fetch(`/api/queue/${id}`, { method: 'DELETE' });
    loadData();
}

async function deleteItem(e, id) {
    e.stopPropagation();
    if (!confirm('Are you sure you want to remove this from your library?')) return;

    try {
        await fetch(`/api/library/${id}`, { method: 'DELETE' });
        loadData();
    } catch (e) {
        alert('Failed to delete item');
    }
}

addBtn.onclick = async () => {
    const url = urlInput.value.trim();
    if (!url) return;

    statusDiv.innerHTML = '<div class="loading-spinner"></div> <p>Adding to queue...</p>';
    addBtn.disabled = true;

    try {
        const res = await fetch('/api/scrape', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url })
        });

        if (!res.ok) throw new Error(await res.text());

        statusDiv.innerHTML = '<p style="color: #10b981;">Added to queue! You can track progress below.</p>';
        urlInput.value = '';
        loadData();
    } catch (e) {
        statusDiv.innerHTML = `<p style="color: #ef4444;">Error: ${e.message}</p>`;
    } finally {
        addBtn.disabled = false;
        setTimeout(() => statusDiv.innerHTML = '', 5000);
    }
};

function showDetails(id) {
    const item = libraryData.find(i => i.id === id);
    if (!item) return;

    let content = `
        <div class="detail-header">
            <img src="${item.poster}" class="detail-poster">
            <div class="detail-info">
                <h2>${item.title}</h2>
                <p class="item-type">${item.type}</p>
                <p class="item-meta">Added on: ${new Date(item.timestamp).toLocaleDateString()}</p>
                <br>
                <a href="${item.url}" target="_blank" style="color: var(--primary-light); text-decoration: none;">
                    <i class="fas fa-external-link-alt"></i> Original Page
                </a>
            </div>
        </div>
    `;

    if (item.type === 'movie') {
        content += renderDownloadTable(item.links);
    } else {
        content += `
            <div class="seasons-container">
                ${item.seasons.map(season => `
                    <div class="season-block">
                        <h3 class="season-title">${season.name}</h3>
                        <div class="episodes-grid">
                            ${season.episodes.map(ep => `
                                <div class="episode-card" onclick="showEpisodeDownloads('${item.id}', '${season.number}', '${ep.number}')">
                                    <strong>Ep ${ep.number}</strong>
                                    <p style="font-size: 0.8rem; margin-top: 0.5rem; color: var(--text-dim);">${ep.title}</p>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    modalBody.innerHTML = content;
    detailModal.style.display = 'block';
}

function renderDownloadTable(links) {
    if (!links || links.length === 0) return '<p>No download links found.</p>';

    return `
        <table class="download-table">
            <thead>
                <tr>
                    <th>Server</th>
                    <th>Language</th>
                    <th>Quality</th>
                    <th>Link</th>
                </tr>
            </thead>
            <tbody>
                ${links.map(link => `
                    <tr>
                        <td>${link.server}</td>
                        <td>${link.lang}</td>
                        <td>${link.quality}</td>
                        <td>
                            <a href="${link.finalLink || link.redirectLink}" target="_blank" class="download-btn">
                                <i class="fas fa-download"></i> Download
                            </a>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

// Global scope for onclicks in strings
window.showEpisodeDownloads = (itemId, seasonNum, epNum) => {
    const item = libraryData.find(i => i.id === itemId);
    const season = item.seasons.find(s => s.number === seasonNum);
    const episode = season.episodes.find(e => e.number === epNum);

    const overlay = document.createElement('div');
    overlay.className = 'modal';
    overlay.style.display = 'block';
    overlay.style.zIndex = '1100';
    overlay.innerHTML = `
        <div class="modal-content">
            <span class="close-modal" onclick="this.parentElement.parentElement.remove()">&times;</span>
            <h3 style="margin-bottom: 2rem;">${episode.title} - Downloads</h3>
            ${renderDownloadTable(episode.links)}
        </div>
    `;
    document.body.appendChild(overlay);
};

closeModal.onclick = () => detailModal.style.display = 'none';
window.onclick = (e) => {
    if (e.target === detailModal) detailModal.style.display = 'none';
};

// Initial load
loadData();

// Poll every 3 seconds
setInterval(loadData, 3000);
