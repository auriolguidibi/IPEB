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

function sendJson(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    let size = 0;
    let tooLarge = false;

    req.setEncoding('utf8');
    req.on('data', (chunk) => {
      size += Buffer.byteLength(chunk, 'utf8');
      if (size > 10 * 1024) {
        tooLarge = true;
      } else if (!tooLarge) {
        body += chunk;
      }
    });
    req.on('end', () => {
      if (tooLarge) {
        const error = new Error('Request body is too large');
        error.statusCode = 413;
        return reject(error);
      }

      try {
        resolve(JSON.parse(body));
      } catch {
        const error = new Error('Invalid JSON body');
        error.statusCode = 400;
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

async function handleContact(req, res) {
  try {
    if (!String(req.headers['content-type'] || '').startsWith('application/json')) {
      return sendJson(res, 415, { error: 'Le format de la demande est invalide.' });
    }

    const data = await readJsonBody(req);
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return sendJson(res, 400, { error: 'Les informations du formulaire sont invalides.' });
    }

    const limits = {
      name: 120,
      structure: 200,
      email: 254,
      phone: 40,
      sujet: 120,
      profil: 120,
      message: 5000,
    };
    const fields = {};
    for (const [key, limit] of Object.entries(limits)) {
      if (data[key] !== undefined && typeof data[key] !== 'string') {
        return sendJson(res, 400, { error: 'Les informations du formulaire sont invalides.' });
      }
      fields[key] = (data[key] || '').trim();
      if (fields[key].length > limit) {
        return sendJson(res, 400, { error: 'Un ou plusieurs champs dépassent la longueur autorisée.' });
      }
    }

    if (!fields.name || !fields.sujet || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email)) {
      return sendJson(res, 400, { error: 'Veuillez vérifier votre nom, votre e-mail et l’objet de la demande.' });
    }

    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.RESEND_FROM_EMAIL;
    if (!apiKey || !from) {
      console.error('Contact form email is not configured: set RESEND_API_KEY and RESEND_FROM_EMAIL.');
      return sendJson(res, 503, { error: 'Le formulaire est temporairement indisponible. Vous pouvez nous écrire à contact@ipeb.bj.' });
    }

    const text = [
      'Objet : ' + fields.sujet,
      'Nom : ' + fields.name,
      'Structure : ' + (fields.structure || '—'),
      'E-mail : ' + fields.email,
      'Téléphone : ' + (fields.phone || '—'),
      'Profil : ' + (fields.profil || '—'),
      '',
      'Message :',
      fields.message || '—',
    ].join('\n');

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: ['contact@ipeb.bj'],
        reply_to: fields.email,
        subject: fields.sujet + ' — IPEB — ' + fields.name,
        text,
      }),
    });

    if (!response.ok) {
      console.error('Contact form email provider returned HTTP ' + response.status + '.');
      return sendJson(res, 502, { error: 'L’envoi a échoué. Veuillez réessayer ou nous écrire à contact@ipeb.bj.' });
    }

    return sendJson(res, 200, { message: 'Votre demande a bien été envoyée à l’IPEB.' });
  } catch (error) {
    if (error.statusCode) {
      return sendJson(res, error.statusCode, {
        error: error.statusCode === 413
          ? 'Le formulaire est trop volumineux.'
          : 'Le formulaire reçu est invalide.',
      });
    }
    console.error('Contact form email delivery failed:', error.message);
    return sendJson(res, 502, { error: 'Impossible d’envoyer votre demande pour le moment. Veuillez réessayer.' });
  }
}

const server = http.createServer((req, res) => {
  const requestUrl = new URL(req.url || '/', 'http://localhost');
  if (req.method === 'POST' && requestUrl.pathname === '/api/contact') {
    handleContact(req, res);
    return;
  }

  try {
    const urlPath = decodeURIComponent(requestUrl.pathname);
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
