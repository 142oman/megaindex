# MegaIndex

A web scraping and indexing application built with Node.js and Express.

## Features

- Web scraping with Puppeteer and Cheerio
- RESTful API for data management
- Modern web interface
- Queue-based processing system

## Deployment

### GitHub Deployment
1. Create a new repository on GitHub.
2. Link your local project: `gh repo create megaindex --public --source=. --remote=origin --push`

### Ubuntu Server Setup
We provide a setup script to automate the installation of Node.js, Puppeteer dependencies, and PM2.

1. **Clone the repository:**
   ```bash
   git clone <your-repo-url>
   cd megaindex
   ```

2. **Run the setup script:**
   ```bash
   chmod +x setup_ubuntu.sh
   ./setup_ubuntu.sh
   ```

3. **Start the application:**
   ```bash
   pm2 start ecosystem.config.js
   ```

4. **Monitor logs:**
   ```bash
   pm2 logs megaindex
   ```

## Dependencies

- Express.js - Web framework
- Puppeteer - Web scraping
- Cheerio - HTML parsing
- Axios - HTTP client
- LowDB - JSON database
- p-limit - Concurrency control
