import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = path.resolve(fileURLToPath(new URL('./public/', import.meta.url)));
const types = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png'};
export const server = http.createServer(async (req,res) => {
  const headers = {'X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin','Content-Security-Policy':"default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'self'"};
  if (!['GET','HEAD'].includes(req.method)) {res.writeHead(405,{...headers,Allow:'GET, HEAD'});return res.end();}
  if (req.url === '/health') {res.writeHead(200,{...headers,'Content-Type':'application/json'});return res.end(req.method==='HEAD'?undefined:JSON.stringify({status:'ok'}));}
  try {
    const pathname = decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    const relative = pathname==='/'?'index.html':pathname.replace(/^\/+/, '');
    const target = path.resolve(root,relative);
    if (!target.startsWith(root+path.sep)) throw new Error('invalid path');
    const body = await readFile(target);
    res.writeHead(200,{...headers,'Content-Type':types[path.extname(target)]||'application/octet-stream','Cache-Control':'no-cache'});
    res.end(req.method==='HEAD'?undefined:body);
  } catch {res.writeHead(404,{...headers,'Content-Type':'text/plain'});res.end('Not found');}
});
if (process.argv[1] === fileURLToPath(import.meta.url)) server.listen(Number(process.env.PORT||8080),'0.0.0.0',()=>console.log(`C20 Fieldguide listening on port ${process.env.PORT||8080}`));
