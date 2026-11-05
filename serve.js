const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';
const ROOT = __dirname;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};

function send404(res) {
  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('404 Not Found');
}

function isInsideRoot(filePath) {
  return filePath === ROOT || filePath.startsWith(ROOT + path.sep);
}

const server = http.createServer((req, res) => {
  try {
    const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
    let filePath = path.normalize(path.join(ROOT, urlPath));
    if (!isInsideRoot(filePath)) return send404(res);

    fs.stat(filePath, (err, stat) => {
      if (!err && stat.isDirectory()) filePath = path.join(filePath, 'index.html');

      fs.stat(filePath, (err2, stat2) => {
        if (err2 || !stat2.isFile()) return send404(res);

        const ext = path.extname(filePath).toLowerCase();
        const type = MIME[ext] || 'application/octet-stream';
        const cache = ext === '.html' ? 'no-cache' : 'public, max-age=86400';
        const range = req.headers.range;

        if (range) {
          const match = /^bytes=(\d*)-(\d*)$/.exec(range);
          let start = match && match[1] ? parseInt(match[1], 10) : 0;
          let end = match && match[2] ? parseInt(match[2], 10) : stat2.size - 1;

          if (isNaN(start) || isNaN(end) || start > end || start >= stat2.size) {
            res.writeHead(416, { 'Content-Range': `bytes */${stat2.size}` });
            return res.end();
          }

          end = Math.min(end, stat2.size - 1);
          res.writeHead(206, {
            'Content-Type': type,
            'Content-Length': end - start + 1,
            'Content-Range': `bytes ${start}-${end}/${stat2.size}`,
            'Accept-Ranges': 'bytes',
            'Cache-Control': cache,
          });
          fs.createReadStream(filePath, { start, end }).pipe(res).on('error', () => res.destroy());
        } else {
          res.writeHead(200, {
            'Content-Type': type,
            'Content-Length': stat2.size,
            'Accept-Ranges': 'bytes',
            'Cache-Control': cache,
          });
          fs.createReadStream(filePath).pipe(res).on('error', () => res.destroy());
        }
      });
    });
  } catch (e) {
    send404(res);
  }
});

server.listen(PORT, HOST, () => {
  console.log(`IPEB server running on http://${HOST}:${PORT}`);
});
