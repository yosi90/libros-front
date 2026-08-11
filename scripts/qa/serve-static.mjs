import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';

const root = path.resolve(valueAfter('--root') || 'dist/book-front/browser');
const host = valueAfter('--host') || '127.0.0.1';
const port = Number(valueAfter('--port') || '4200');

await stat(path.join(root, 'index.html'));

const server = createServer(async (request, response) => {
    try {
        const pathname = decodeURIComponent(new URL(request.url || '/', `http://${host}`).pathname);
        const requested = path.resolve(root, `.${pathname}`);
        if (requested !== root && !requested.startsWith(`${root}${path.sep}`)) {
            response.writeHead(403).end('Forbidden');
            return;
        }

        let filePath = requested;
        try {
            const info = await stat(filePath);
            if (info.isDirectory()) filePath = path.join(filePath, 'index.html');
        } catch {
            filePath = path.join(root, 'index.html');
        }

        response.setHeader('Cache-Control', 'no-store');
        response.setHeader('Content-Type', contentType(filePath));
        createReadStream(filePath).on('error', () => response.writeHead(500).end()).pipe(response);
    } catch {
        response.writeHead(400).end('Bad Request');
    }
});

server.listen(port, host, () => console.log(`Artefacto QA servido en http://${host}:${port}`));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(() => process.exit(0)));

function valueAfter(name) {
    const index = process.argv.indexOf(name);
    return index >= 0 ? process.argv[index + 1] : undefined;
}

function contentType(filePath) {
    return ({
        '.css': 'text/css; charset=utf-8',
        '.html': 'text/html; charset=utf-8',
        '.ico': 'image/x-icon',
        '.js': 'text/javascript; charset=utf-8',
        '.json': 'application/json; charset=utf-8',
        '.png': 'image/png',
        '.svg': 'image/svg+xml',
        '.webp': 'image/webp'
    })[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
}
