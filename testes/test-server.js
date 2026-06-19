import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Simple .env parser to avoid external dependencies
function loadEnv() {
    try {
        const envPath = path.join(process.cwd(), '.env');
        if (fs.existsSync(envPath)) {
            const content = fs.readFileSync(envPath, 'utf8');
            content.split('\n').forEach(line => {
                const trimmed = line.trim();
                if (trimmed && !trimmed.startsWith('#')) {
                    const idx = trimmed.indexOf('=');
                    if (idx > -1) {
                        const key = trimmed.substring(0, idx).trim();
                        let val = trimmed.substring(idx + 1).trim();
                        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
                            val = val.substring(1, val.length - 1);
                        }
                        process.env[key] = val;
                    }
                }
            });
        }
    } catch (e) {
        console.error('Failed to load .env:', e.message);
    }
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

const MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

let serverInstance = null;

export async function startServer(port = 3000) {
    loadEnv();
    
    // Import Vercel function handlers dynamically
    const { default: configHandler } = await import('../api/config.js');
    const { default: geminiHandler } = await import('../api/gemini.js');

    return new Promise((resolve) => {
        serverInstance = http.createServer(async (req, res) => {
            // Setup response helpers compatible with Vercel's req/res api
            res.status = (code) => {
                res.statusCode = code;
                return res;
            };
            res.json = (data) => {
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(data));
                return res;
            };

            const url = new URL(req.url, `http://${req.headers.host}`);

            if (url.pathname === '/api/config') {
                return configHandler(req, res);
            }

            if (url.pathname === '/api/gemini') {
                let body = '';
                req.on('data', chunk => { body += chunk; });
                req.on('end', async () => {
                    try {
                        req.body = body ? JSON.parse(body) : {};
                    } catch (e) {
                        req.body = {};
                    }
                    await geminiHandler(req, res);
                });
                return;
            }

            // Resolve file paths under ROOT
            let filePath = path.join(ROOT, url.pathname === '/' ? 'index.html' : url.pathname);
            
            if (!filePath.startsWith(ROOT)) {
                res.status(403).end('Forbidden');
                return;
            }

            fs.readFile(filePath, (err, data) => {
                if (err) {
                    res.status(404).end('Not Found');
                    return;
                }
                const ext = path.extname(filePath).toLowerCase();
                res.setHeader('Content-Type', MIME_TYPES[ext] || 'text/plain');
                res.end(data);
            });
        });

        serverInstance.listen(port, () => {
            console.log(`[Test Server] Listening on http://localhost:${port}`);
            resolve(serverInstance);
        });
    });
}

export function stopServer() {
    return new Promise((resolve) => {
        if (serverInstance) {
            serverInstance.close(() => {
                console.log('[Test Server] Stopped.');
                resolve();
            });
        } else {
            resolve();
        }
    });
}
