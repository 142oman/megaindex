#!/bin/bash

# Exit on error
set -e

echo "🚀 Starting MegaIndex Ubuntu Setup..."

# 1. Update system
echo "Updating system packages..."
sudo apt-get update && sudo apt-get upgrade -y

# 2. Install Node.js (LTS 20)
echo "Installing Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 3. Install Puppeteer dependencies
echo "Installing Puppeteer/Chromium dependencies..."
sudo apt-get install -y \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libc6 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libexpat1 \
    libfontconfig1 \
    libgbm1 \
    libgcc1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libstdc++6 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    lsb-release \
    wget \
    xdg-utils

# 4. Install PM2 globally
echo "Installing PM2..."
sudo npm install -g pm2

# 5. Project Setup
echo "Installing project dependencies..."
npm install

# 6. PM2 Startup
echo "Setting up PM2 startup..."
pm2 startup
echo "Setup complete! Use 'pm2 start ecosystem.config.js' to run the app."
