/**
 * Simple HTTP server for testing Unplug PWA locally
 * Run with: node server.js
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 3000;

// MIME types for different file extensions
const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.webp': 'image/webp',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.eot': 'application/vnd.ms-fontobject'
};

// Get MIME type for file extension
function getMimeType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    return mimeTypes[ext] || 'application/octet-stream';
}

// Serve static files
function serveStaticFile(filePath, res) {
    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(404, { 'Content-Type': 'text/html' });
            res.end('<h1>404 Not Found</h1>');
            return;
        }

        const mimeType = getMimeType(filePath);
        const headers = {
            'Content-Type': mimeType,
            'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
        };

        // Add CORS headers for development
        headers['Access-Control-Allow-Origin'] = '*';
        headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS';
        headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization';

        // Add security headers
        headers['X-Content-Type-Options'] = 'nosniff';
        headers['X-Frame-Options'] = 'DENY';
        headers['X-XSS-Protection'] = '1; mode=block';

        res.writeHead(200, headers);
        res.end(data);
    });
}

// Create HTTP server
const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    let pathname = parsedUrl.pathname;

    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        res.writeHead(200, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        });
        res.end();
        return;
    }

    // Default to index.html for root path
    if (pathname === '/') {
        pathname = '/index.html';
    }

    // Construct file path
    const filePath = path.join(__dirname, pathname);

    // Security check - prevent directory traversal
    const normalizedPath = path.normalize(filePath);
    if (!normalizedPath.startsWith(__dirname)) {
        res.writeHead(403, { 'Content-Type': 'text/html' });
        res.end('<h1>403 Forbidden</h1>');
        return;
    }

    // Check if file exists
    fs.stat(normalizedPath, (err, stats) => {
        if (err) {
            // File doesn't exist, try to serve index.html for SPA routing
            if (pathname.startsWith('/') && !pathname.includes('.')) {
                serveStaticFile(path.join(__dirname, 'index.html'), res);
            } else {
                res.writeHead(404, { 'Content-Type': 'text/html' });
                res.end('<h1>404 Not Found</h1>');
            }
            return;
        }

        // If it's a directory, serve index.html
        if (stats.isDirectory()) {
            const indexPath = path.join(normalizedPath, 'index.html');
            serveStaticFile(indexPath, res);
        } else {
            // Serve the file
            serveStaticFile(normalizedPath, res);
        }
    });
});

// Start server
server.listen(PORT, () => {
    console.log(`🚀 Unplug PWA Server running at:`);
    console.log(`   Local:   http://localhost:${PORT}`);
    console.log(`   Network: http://192.168.1.x:${PORT} (check your IP)`);
    console.log('');
    console.log('📱 To test on iPhone:');
    console.log('   1. Make sure your iPhone is on the same WiFi network');
    console.log('   2. Find your computer\'s IP address');
    console.log('   3. Open Safari on iPhone and go to http://YOUR_IP:' + PORT);
    console.log('   4. Add to Home Screen to install the PWA');
    console.log('');
    console.log('🛠️  Development tips:');
    console.log('   - Use Chrome DevTools to test PWA features');
    console.log('   - Check Application tab for Service Worker and Manifest');
    console.log('   - Use Lighthouse to audit PWA compliance');
    console.log('');
    console.log('Press Ctrl+C to stop the server');
});

// Handle server shutdown gracefully
process.on('SIGINT', () => {
    console.log('\n🛑 Server shutting down...');
    server.close(() => {
        console.log('✅ Server stopped');
        process.exit(0);
    });
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Server shutting down...');
    server.close(() => {
        console.log('✅ Server stopped');
        process.exit(0);
    });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    console.error('❌ Uncaught Exception:', err);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

module.exports = server;
