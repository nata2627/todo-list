const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
};

// Serves the site under /todo-list/ to match the GitHub Pages path,
// so a broken absolute link shows up locally too.
const PREFIX = '/todo-list/';

function startServer() {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    if (!url.pathname.startsWith(PREFIX)) {
      res.writeHead(404).end();
      return;
    }
    const name = url.pathname.slice(PREFIX.length) || 'index.html';
    const file = path.join(ROOT, name);
    const type = TYPES[path.extname(file)];
    if (!file.startsWith(ROOT + path.sep) || !type || !fs.existsSync(file)) {
      res.writeHead(404).end();
      return;
    }
    res.writeHead(200, { 'Content-Type': type });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise(resolve => {
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({ url: `http://127.0.0.1:${port}${PREFIX}`, close: () => server.close() });
    });
  });
}

module.exports = { startServer };

if (require.main === module) {
  startServer().then(({ url }) => console.log(url));
}
