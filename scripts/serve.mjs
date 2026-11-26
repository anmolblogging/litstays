import http from 'node:http';
import path from 'node:path';
import { readFile, stat } from 'node:fs/promises';
import { gzipSync, brotliCompressSync } from 'node:zlib';
import { availabilityResponse } from '../server/availability-api.ts';
import { enquiryResponse } from '../server/enquiry.ts';

const root = path.resolve('out');
const port = Number(process.env.PORT || 3000);
const types = { '.pdf': 'application/pdf', '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml' };
const cache = new Map();
const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, 'http://localhost');
    const pathname = decodeURIComponent(url.pathname);
    if (pathname.replace(/\/$/, '') === '/api/enquiry') {
      const origin = request.headers.origin;
      const allowed = (process.env.AVAILABILITY_ALLOWED_ORIGIN || '').split(',').map(value => value.trim()).filter(Boolean);
      if (origin && allowed.length && !allowed.includes(origin)) { response.writeHead(403); response.end(); return; }
      const cors = origin && allowed.includes(origin) ? { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Methods': 'POST', 'Access-Control-Allow-Headers': 'Content-Type', Vary: 'Origin' } : {};
      if (request.method === 'OPTIONS') { response.writeHead(204, cors); response.end(); return; }
      const chunks = []; let size = 0;
      for await (const chunk of request) { size += chunk.length; if (size > 20000) break; chunks.push(chunk); }
      const result = await enquiryResponse(new Request(url, { method: request.method, body: request.method === 'POST' ? Buffer.concat(chunks) : undefined, headers: { 'Content-Type': 'application/json' } }), request.socket.remoteAddress || 'local');
      response.writeHead(result.status, { ...Object.fromEntries(result.headers), ...cors });
      response.end(await result.text());
      return;
    }
    if (!['GET', 'HEAD'].includes(request.method)) { response.writeHead(405, { Allow: 'GET, HEAD' }); response.end(); return; }
    if (pathname === '/api/availability') {
      const origin = request.headers.origin;
      const allowed = (process.env.AVAILABILITY_ALLOWED_ORIGIN || '').split(',').map(value => value.trim()).filter(Boolean);
      if (origin && allowed.length && !allowed.includes(origin)) { response.writeHead(403); response.end(); return; }
      const result = await availabilityResponse(url, request.socket.remoteAddress || 'local');
      response.writeHead(result.status, { ...Object.fromEntries(result.headers), ...(origin && allowed.includes(origin) ? { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' } : {}) });
      response.end(request.method === 'HEAD' ? undefined : await result.text());
      return;
    }
    if (process.env.API_ONLY === '1') { response.writeHead(404); response.end(); return; }
    let file = path.resolve(root, `.${pathname}`);
    if (!file.startsWith(`${root}${path.sep}`) && file !== root) { response.writeHead(403); response.end(); return; }
    if ((await stat(file)).isDirectory()) file = path.join(file, 'index.html');
    const modified = (await stat(file)).mtimeMs;
    let entry = cache.get(file);
    if (!entry || entry.modified !== modified) {
      const raw = await readFile(file);
      const compressible = /\.(html|js|css|svg|txt|xml)$/.test(file);
      entry = { raw, modified, gzip: compressible ? gzipSync(raw) : null, br: compressible ? brotliCompressSync(raw) : null };
      cache.set(file, entry);
    }
    const accepts = request.headers['accept-encoding'] || '';
    const encoding = entry.br && accepts.includes('br') ? 'br' : entry.gzip && accepts.includes('gzip') ? 'gzip' : null;
    const body = encoding ? entry[encoding] : entry.raw;
    response.writeHead(200, {
      'Content-Type': types[path.extname(file)] || 'application/octet-stream',
      'Content-Length': body.length,
      'Cache-Control': pathname.startsWith('/_next/static/') ? 'public, max-age=31536000, immutable' : /\.(webp|woff2|png)$/.test(file) ? 'public, max-age=3600' : 'no-cache',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      Vary: 'Accept-Encoding',
      ...(encoding ? { 'Content-Encoding': encoding } : {}),
    });
    response.end(request.method === 'HEAD' ? undefined : body);
  } catch {
    response.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    response.end(await readFile(path.join(root, '404.html')).catch(() => 'Not found'));
  }
});
server.listen(port, process.env.LITSTAYS_HOST || '127.0.0.1', () => console.log(`The Lit Stays is ready at http://localhost:${port}`));
