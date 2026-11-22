// The Gilded Vault — tiny static server for local play. Serves the game
// folder on port 8080 (or --port N), sending the right content types and
// refusing any path outside the game folder.
//   node serve.ts [--port 8080]
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, normalize, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = fileURLToPath(new URL('./game', import.meta.url));
const TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
};

const portArg = process.argv.indexOf('--port');
const PORT = portArg >= 0 ? Number(process.argv[portArg + 1]) || 8080 : 8080;

const server = createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  const path = normalize(join(HERE, url === '/' ? 'index.html' : url));
  if (!path.startsWith(HERE) || !existsSync(path) || !statSync(path).isFile()) {
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('not found');
    return;
  }
  res.writeHead(200, { 'content-type': TYPES[extname(path)] || 'application/octet-stream' });
  res.end(readFileSync(path));
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`The Gilded Vault serving on http://127.0.0.1:${PORT}/`);
});
