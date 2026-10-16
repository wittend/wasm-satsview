import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
const root = resolve('.');
const mime = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.wasm':'application/wasm', '.json':'application/json' };
const server = createServer(async (req,res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const file = resolve(root, '.' + (pathname === '/' ? '/demo/index.html' : pathname));
    if (!file.startsWith(root + '/')) { res.writeHead(403).end(); return; }
    const content = await readFile(file);
    res.writeHead(200, {'Content-Type':mime[extname(file)] ?? 'application/octet-stream','Cache-Control':'no-store'}).end(content);
  } catch { res.writeHead(404).end('Not found'); }
});
server.listen(Number(process.env.PORT ?? 5173), '127.0.0.1', () => console.log(`Sky view: http://127.0.0.1:${server.address().port}`));
