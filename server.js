// Local development server with /api/chat proxy
// Reads GROQ_API_KEY from .env file (never committed to git)
const http = require('http');
const fs = require('fs');
const path = require('path');

// Load .env file manually (no dependencies needed)
try {
  const env = fs.readFileSync(path.join(__dirname, '.env'), 'utf8');
  env.split('\n').forEach(line => {
    const [key, ...val] = line.split('=');
    if (key && val.length) process.env[key.trim()] = val.join('=').trim();
  });
  console.log('✅ Loaded .env file');
} catch {
  console.warn('⚠️  No .env file found. Create one with GROQ_API_KEY=your_key');
}

const PORT = 5500;
const MIME = {
  '.html': 'text/html',
  '.css':  'text/css',
  '.js':   'application/javascript',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
};

const NO_CACHE = {
  'Cache-Control': 'no-store, no-cache, must-revalidate',
  'Pragma': 'no-cache',
};

http.createServer(async (req, res) => {
  // ===== /api/chat proxy =====
  if (req.method === 'POST' && req.url === '/api/chat') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      const apiKey = process.env.GROQ_API_KEY;
      if (!apiKey) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'GROQ_API_KEY not set in .env' }));
      }
      try {
        const { messages, model } = JSON.parse(body);
        // Use built-in fetch (Node 18+) or fallback
        const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({ model: model || 'llama-3.3-70b-versatile', messages, max_tokens: 800, temperature: 0.7 })
        });
        const data = await groqRes.json();
        res.writeHead(groqRes.status, { 'Content-Type': 'application/json', ...NO_CACHE });
        res.end(JSON.stringify(data));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // ===== Static file serving =====
  let urlPath = req.url.split('?')[0];
  if (urlPath === '/') urlPath = '/index.html';

  const filePath = path.join(__dirname, urlPath);
  const ext = path.extname(filePath);
  const contentType = MIME[ext] || 'text/plain';

  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); return res.end('Not found'); }
    res.writeHead(200, { 'Content-Type': contentType, ...NO_CACHE });
    res.end(data);
  });

}).listen(PORT, () => {
  console.log(`✅ VoteWise dev server → http://localhost:${PORT}`);
  console.log('   /api/chat proxy enabled for local Groq calls');
});
