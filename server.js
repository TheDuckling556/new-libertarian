require('dotenv').config();
const express = require('express');
const session = require('express-session');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3002;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'libertarian2026';

// --- Storage: Upstash Redis in prod, JSON file in dev ---
const USE_REDIS = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
const DB_FILE = path.join('/tmp', 'stories.json'); // /tmp for Vercel
const LOCAL_DB = path.join(__dirname, 'data', 'stories.json');
const STORIES_KEY = 'nl:stories';
const NEXT_ID_KEY = 'nl:nextId';

let redis;
if (USE_REDIS) {
  const { Redis } = require('@upstash/redis');
  redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
}

async function getStories() {
  if (USE_REDIS) {
    const stories = await redis.get(STORIES_KEY);
    return stories || [];
  }
  const file = fs.existsSync(LOCAL_DB) ? LOCAL_DB : DB_FILE;
  if (!fs.existsSync(file)) return [];
  return JSON.parse(fs.readFileSync(file, 'utf8')).stories || [];
}

async function getNextId() {
  if (USE_REDIS) {
    const id = await redis.incr(NEXT_ID_KEY);
    return id;
  }
  const file = fs.existsSync(LOCAL_DB) ? LOCAL_DB : DB_FILE;
  if (!fs.existsSync(file)) return 1;
  return JSON.parse(fs.readFileSync(file, 'utf8')).nextId || 1;
}

async function saveStories(stories, nextId) {
  if (USE_REDIS) {
    await redis.set(STORIES_KEY, stories);
    return;
  }
  const target = fs.existsSync(path.dirname(LOCAL_DB)) ? LOCAL_DB : DB_FILE;
  fs.writeFileSync(target, JSON.stringify({ stories, nextId }, null, 2));
}

// Seed data
const SEED = [
  { headline: "Massie's War Powers resolution fails — only non-interventionists said no to endless war", url: "https://spectrumlocalnews.com/mo/st-louis/news/2026/03/05/house-rejects-massie-resolution", source: "Spectrum News", type: "article", category: "war", pinned: true },
  { headline: "Tucker Carlson questions the Iran war — Trump fires back", url: "https://x.com/jonkarl/status/2029650210125652143", source: "X / Twitter", type: "tweet", category: "war", pinned: true },
  { headline: "Oil spikes 35% — biggest weekly gain in history as Iran war escalates", url: "https://www.cnbc.com/2026/03/06/iran-us-war-oil-prices-brent-wti-barrel-futures.html", source: "CNBC", type: "article", category: "economy", pinned: true },
  { headline: "Rand Paul: 'No one voted for war with Iran. Congress abdicated its duty.'", url: "https://www.paul.senate.gov", source: "Sen. Rand Paul", type: "article", category: "war", pinned: true },
  { headline: "Scott Horton: How the war party got everything it wanted — again", url: "https://libertarianinstitute.org", source: "Libertarian Institute", type: "article", category: "war", pinned: true },
  { headline: "Defense contractors agree to quadruple production. Follow the money.", url: "https://www.cnbc.com/2026/03/06/iran-war-trump-defense-companies-pete-hegseth.html", source: "CNBC", type: "article", category: "war", pinned: false },
  { headline: "Strait of Hormuz closure could spike oil to $150 — Qatar energy minister warns", url: "https://www.dawn.com/news/1979108", source: "Dawn", type: "article", category: "war", pinned: false },
  { headline: "Three U.S. Reaper drones shot down since Iran war began", url: "https://www.iranintl.com/en/202603061045", source: "Iran International", type: "article", category: "war", pinned: false },
  { headline: "Gulf states running low on drone interceptors — the mounting cost of empire", url: "https://www.cbsnews.com/news/arab-states-running-low-interceptors-iranian-fired-missiles/", source: "CBS News", type: "article", category: "war", pinned: false },
  { headline: "Global flights squeezed into narrow corridor to avoid Middle East war zone", url: "https://www.aol.com/articles/narrow-corridor-planes-being-pushed-112152115.html", source: "AP", type: "article", category: "war", pinned: false },
  { headline: "Hegseth: 'We're just getting started.' But at what cost to taxpayers?", url: "https://x.com/WhiteHouse/status/2029690803153715256", source: "X / Twitter", type: "tweet", category: "war", pinned: false },
  { headline: "Obama dropped 26,000 bombs in one year — same playbook, different president", url: "https://www.youtube.com/watch?v=80H3NaXiuRo", source: "YouTube", type: "video", category: "war", pinned: false },
  { headline: "Ron Paul: Iran war is unconstitutional — where is Congress?", url: "https://www.ronpaulinstitute.org", source: "Ron Paul Institute", type: "article", category: "war", pinned: false },
  { headline: "'We don't need a democracy in Iran' — Trump draws libertarian criticism", url: "https://www.cnn.com/2026/03/06/politics/trump-interview-iran-cuba-dana-bash", source: "CNN", type: "article", category: "war", pinned: false },
  { headline: "U.S. picks Iran's next leader — nation-building redux", url: "https://archive.is/BJnbf", source: "Politico", type: "article", category: "war", pinned: false },
  { headline: "Venezuela: Another country where U.S. intervention has made things worse", url: "https://www.cato.org", source: "Cato Institute", type: "article", category: "war", pinned: false },
  { headline: "Conservatives who opposed Iraq now opposing Iran war — a roundup", url: "https://www.theamericanconservative.com", source: "The American Conservative", type: "article", category: "war", pinned: false },
  { headline: "The military-industrial complex just had its best week in a decade", url: "https://antiwar.com", source: "Antiwar.com", type: "article", category: "war", pinned: false },
  { headline: "How the Iran war will blow back on American consumers", url: "https://mises.org", source: "Mises Institute", type: "article", category: "war", pinned: false },
  { headline: "Patrick Buchanan was right — the cost of American empire", url: "https://www.theamericanconservative.com", source: "The American Conservative", type: "article", category: "war", pinned: false },
  { headline: "Gas prices rising nationwide — the hidden tax of foreign war", url: "https://gasprices.aaa.com/", source: "AAA", type: "article", category: "economy", pinned: false },
  { headline: "Dow drops 800 points on war contagion fears", url: "https://www.cnbc.com/2026/03/05/stock-market-today-live-updates.html", source: "CNBC", type: "article", category: "economy", pinned: false },
  { headline: "Jobs report far weaker than expected — unemployment rising as war rattles markets", url: "https://www.cnbc.com/2026/03/06/february-2026-jobs-report.html", source: "CNBC", type: "article", category: "economy", pinned: false },
  { headline: "BlackRock limits redemptions at $26B fund amid war uncertainty", url: "https://archive.is/NHZjj", source: "Financial Times", type: "article", category: "economy", pinned: false },
  { headline: "Oil climbs to $93/barrel — fear of spike to $150 if Gulf exporters halt", url: "https://www.cnbc.com/2026/03/06/iran-us-war-oil-prices-brent-wti-barrel-futures.html", source: "CNBC", type: "article", category: "economy", pinned: false },
  { headline: "Peter Schiff: The Fed will monetize the Iran war debt — dollar collapse ahead", url: "https://www.schiffgold.com", source: "Schiff Gold", type: "article", category: "economy", pinned: false },
  { headline: "War economies always end the same way — inflation, debt, decline", url: "https://mises.org", source: "Mises Institute", type: "article", category: "economy", pinned: false },
  { headline: "The real cost of empire: how war spending hollows out the middle class", url: "https://www.theamericanconservative.com", source: "The American Conservative", type: "article", category: "economy", pinned: false },
  { headline: "Taxpayers on the hook: $20B insurance program for oil tankers announced", url: "https://www.cnbc.com/2026/03/06/trump-reinsurance-oil-iran-war.html", source: "CNBC", type: "article", category: "spending", pinned: false },
  { headline: "Did Ukraine get caught laundering? $82M in cash and gold seized.", url: "https://www.nbcnews.com/world/ukraine/hungary-detains-ukrainians-carrying-82-million-cash-gold-kyiv-calls-ho-rcna262063", source: "NBC News", type: "article", category: "spending", pinned: false },
  { headline: "Federal workforce down 330,000 — 11% since October 2024 peak", url: "https://x.com/BillMelugin_/status/2029929265844687349", source: "X / Twitter", type: "tweet", category: "spending", pinned: false },
  { headline: "Congress still hasn't passed a real budget — spending by continuing resolution again", url: "https://www.cato.org", source: "Cato Institute", type: "article", category: "spending", pinned: false },
  { headline: "Pentagon can't pass an audit — but we're sending billions more to the Middle East", url: "https://libertarianinstitute.org", source: "Libertarian Institute", type: "article", category: "spending", pinned: false },
  { headline: "National debt crosses $37 trillion as war spending accelerates", url: "https://www.usdebtclock.org", source: "US Debt Clock", type: "article", category: "spending", pinned: false },
  { headline: "Interest on the national debt now exceeds defense spending — think about that", url: "https://www.cbo.gov", source: "CBO", type: "article", category: "spending", pinned: false },
  { headline: "Why does the U.S. still have 750 military bases abroad? No one can answer.", url: "https://www.theamericanconservative.com", source: "The American Conservative", type: "article", category: "spending", pinned: false },
  { headline: "Brandon Herrera wins Texas seat — anti-war vote defeats GOP establishment", url: "https://x.com/Acyn/status/2029779296064241980", source: "X / Twitter", type: "tweet", category: "politics", pinned: false },
  { headline: "Ken Paxton drops out — what it means for the libertarian wing of the GOP", url: "https://x.com/KenPaxtonTX/status/2029607496395239546", source: "X / Twitter", type: "tweet", category: "politics", pinned: false },
  { headline: "Kristi Noem fired — Mullin takes DHS", url: "https://truthsocial.com/@realDonaldTrump/posts/116178030946996760", source: "Truth Social", type: "article", category: "politics", pinned: false },
  { headline: "Libertarians ask: where is the peace faction in MAGA?", url: "https://reason.com", source: "Reason", type: "article", category: "politics", pinned: false },
  { headline: "Why the anti-war right is gaining — and the GOP establishment is worried", url: "https://www.theamericanconservative.com", source: "The American Conservative", type: "article", category: "politics", pinned: false },
  { headline: "Pentagon labels Anthropic an AI supply chain risk — government creep into tech", url: "https://spectrumlocalnews.com/mo/st-louis/news/2026/03/06/pentagon-says-it-is-labeling-ai-company-anthropic-a-supply-chain-risk--effective-immediately-", source: "Spectrum News", type: "article", category: "government", pinned: false },
  { headline: "Surveillance state expands under cover of Iran war — civil liberties groups sound alarm", url: "https://www.aclu.org", source: "ACLU", type: "article", category: "government", pinned: false },
  { headline: "War always expands government. Always.", url: "https://mises.org", source: "Mises Institute", type: "article", category: "government", pinned: false },
  { headline: "Free speech online under pressure as anti-war voices get flagged as 'disinformation'", url: "https://reason.com", source: "Reason", type: "article", category: "government", pinned: false },
  { headline: "Emergency war powers — what Trump can and can't do without Congress", url: "https://reason.com", source: "Reason", type: "article", category: "government", pinned: false },
];

async function seedIfEmpty() {
  const stories = await getStories();
  if (stories.length > 0) return;
  const now = new Date().toISOString();
  const seeded = SEED.map((s, i) => ({ id: i + 1, ...s, created_at: now }));
  await saveStories(seeded, seeded.length + 1);
}

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: process.env.SESSION_SECRET || 'nl-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 86400000, secure: process.env.NODE_ENV === 'production' }
}));

function requireAuth(req, res, next) {
  if (req.session.authenticated) return next();
  res.redirect('/admin/login');
}

// --- API ---
app.get('/api/stories', async (req, res) => {
  await seedIfEmpty();
  const cat = req.query.category;
  let stories = await getStories();
  if (cat && cat !== 'all') stories = stories.filter(s => s.category === cat);
  stories.sort((a, b) => {
    if (b.pinned !== a.pinned) return (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0);
    return new Date(b.created_at) - new Date(a.created_at);
  });
  res.json(stories);
});

// --- Admin pages (same as before, inline HTML) ---
function loginPage(err = false) {
  return `<!DOCTYPE html><html><head><title>Admin — New Libertarian</title>
  <style>*{box-sizing:border-box;margin:0;padding:0}body{background:#000;color:#e0e0e0;font-family:system-ui;display:flex;align-items:center;justify-content:center;min-height:100vh}
  .box{background:#111;border:1px solid #222;border-radius:8px;padding:2rem;width:320px}h2{color:#fff;margin-bottom:1.5rem;font-size:1.1rem;text-transform:uppercase;letter-spacing:.05em}
  input{width:100%;padding:.75rem;background:#000;border:1px solid #333;color:#e0e0e0;border-radius:4px;margin-bottom:1rem;font-size:.95rem}
  button{width:100%;padding:.75rem;background:#cc0000;color:#fff;border:none;border-radius:4px;font-weight:700;cursor:pointer}
  .err{color:#cc0000;font-size:.85rem;margin-bottom:.75rem}</style></head>
  <body><div class="box"><h2>New Libertarian Admin</h2>
  ${err ? '<p class="err">Wrong password.</p>' : ''}
  <form method="POST" action="/admin/login">
  <input type="password" name="password" placeholder="Password" autofocus />
  <button>Login</button></form></div></body></html>`;
}

function adminPage(stories) {
  const rows = stories.map(s => `<tr>
    <td style="max-width:340px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap"><a href="${s.url}" target="_blank">${s.headline}</a></td>
    <td>${s.source}</td><td>${s.category}</td><td>${s.type}</td><td>${s.pinned ? '📌' : ''}</td>
    <td>
      <form method="POST" action="/admin/delete/${s.id}" style="display:inline">
        <button type="submit" style="background:#990000;color:#fff;border:none;padding:.2rem .5rem;border-radius:3px;cursor:pointer;font-size:.78rem">✕</button>
      </form>
      <a href="/admin/edit/${s.id}" style="background:#222;color:#e0e0e0;padding:.2rem .5rem;border-radius:3px;font-size:.78rem;text-decoration:none;margin-left:.25rem">Edit</a>
    </td></tr>`).join('');
  return `<!DOCTYPE html><html><head><title>Admin — New Libertarian</title>
  <style>*{box-sizing:border-box;margin:0;padding:0}body{background:#000;color:#e0e0e0;font-family:system-ui;padding:2rem}
  h1{color:#fff;margin-bottom:1.5rem;font-size:1.1rem;text-transform:uppercase;letter-spacing:.05em}a{color:#cc0000}
  .box{background:#111;border:1px solid #222;border-radius:6px;padding:1.25rem;margin-bottom:1.5rem}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:.6rem;margin-bottom:.6rem}.full{grid-column:1/-1}
  input,select{width:100%;padding:.5rem;background:#000;border:1px solid #333;color:#e0e0e0;border-radius:4px;font-size:.85rem}
  .btn{background:#cc0000;color:#fff;border:none;padding:.5rem 1.2rem;border-radius:4px;font-weight:700;cursor:pointer}
  table{width:100%;border-collapse:collapse;font-size:.8rem}
  th{text-align:left;padding:.45rem .5rem;background:#111;color:#555;border-bottom:1px solid #1a1a1a}
  td{padding:.45rem .5rem;border-bottom:1px solid #111}
  nav{display:flex;justify-content:space-between;align-items:center;margin-bottom:1.25rem}
  </style></head><body>
  <nav><h1>New Libertarian — Admin</h1>
  <div style="display:flex;gap:1rem;align-items:center">
    <form method="POST" action="/admin/scrape" style="display:inline">
      <button type="submit" style="background:#333;color:#e0e0e0;border:1px solid #444;padding:.4rem 1rem;border-radius:4px;cursor:pointer;font-size:.82rem">⟳ Scrape Now</button>
    </form>
    <a href="/admin/logout">Logout</a>
  </div></nav>
  <div class="box"><h3 style="margin-bottom:.9rem;font-size:.9rem;color:#888;text-transform:uppercase;letter-spacing:.05em">Add Story</h3>
  <form method="POST" action="/admin/add"><div class="grid">
    <div class="full"><input name="headline" placeholder="Headline" required /></div>
    <div class="full"><input name="url" placeholder="URL" required /></div>
    <input name="source" placeholder="Source" required />
    <select name="type"><option value="article">📰 Article</option><option value="video">▶ Video</option><option value="tweet">✦ Tweet</option><option value="substack">✉ Substack</option><option value="podcast">🎙 Podcast</option></select>
    <select name="category"><option value="war">War & Foreign Policy</option><option value="economy">Economy</option><option value="spending">Gov Spending</option><option value="politics">Politics</option><option value="government">Government</option><option value="general">General</option></select>
    <select name="pinned"><option value="0">Not pinned</option><option value="1">📌 Pin to top (red)</option></select>
  </div><button type="submit" class="btn">Add Story</button></form></div>
  <table><thead><tr><th>Headline</th><th>Source</th><th>Cat</th><th>Type</th><th>📌</th><th></th></tr></thead>
  <tbody>${rows}</tbody></table></body></html>`;
}

app.get('/admin/login', (req, res) => res.send(loginPage(req.query.err)));
app.post('/admin/login', (req, res) => {
  if (req.body.password === ADMIN_PASSWORD) { req.session.authenticated = true; res.redirect('/admin'); }
  else res.redirect('/admin/login?err=1');
});
app.get('/admin/logout', (req, res) => { req.session.destroy(); res.redirect('/admin/login'); });

app.get('/admin', requireAuth, async (req, res) => {
  const stories = (await getStories()).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  res.send(adminPage(stories));
});

app.post('/admin/add', requireAuth, async (req, res) => {
  const stories = await getStories();
  const { headline, url, source, type, category, pinned } = req.body;
  const id = Date.now();
  stories.unshift({ id, headline, url, source, type, category, pinned: pinned === '1' ? 1 : 0, created_at: new Date().toISOString() });
  await saveStories(stories, id + 1);
  res.redirect('/admin');
});

app.post('/admin/delete/:id', requireAuth, async (req, res) => {
  let stories = await getStories();
  stories = stories.filter(s => s.id !== parseInt(req.params.id));
  await saveStories(stories);
  res.redirect('/admin');
});

app.get('/admin/edit/:id', requireAuth, async (req, res) => {
  const stories = await getStories();
  const s = stories.find(x => x.id === parseInt(req.params.id));
  if (!s) return res.redirect('/admin');
  const o = (v, l, c) => `<option value="${v}" ${c===v?'selected':''}>${l}</option>`;
  res.send(`<!DOCTYPE html><html><head><title>Edit</title>
  <style>*{box-sizing:border-box;margin:0;padding:0}body{background:#000;color:#e0e0e0;font-family:system-ui;padding:2rem;max-width:560px}
  h2{color:#fff;margin-bottom:1.25rem;font-size:1rem;text-transform:uppercase}
  input,select{width:100%;padding:.55rem;background:#111;border:1px solid #333;color:#e0e0e0;border-radius:4px;font-size:.88rem;margin-bottom:.65rem}
  .btn{background:#cc0000;color:#fff;border:none;padding:.55rem 1.25rem;border-radius:4px;font-weight:700;cursor:pointer}a{color:#cc0000;margin-left:1rem}</style></head>
  <body><h2>Edit Story</h2>
  <form method="POST" action="/admin/edit/${s.id}">
    <input name="headline" value="${s.headline}" required />
    <input name="url" value="${s.url}" required />
    <input name="source" value="${s.source}" required />
    <select name="type">${o('article','📰 Article',s.type)}${o('video','▶ Video',s.type)}${o('tweet','✦ Tweet',s.type)}${o('substack','✉ Substack',s.type)}${o('podcast','🎙 Podcast',s.type)}</select>
    <select name="category">${o('war','War',s.category)}${o('economy','Economy',s.category)}${o('spending','Gov Spending',s.category)}${o('politics','Politics',s.category)}${o('government','Government',s.category)}${o('general','General',s.category)}</select>
    <select name="pinned">${o('0','Not pinned',s.pinned?'1':'0')}${o('1','📌 Pin to top',s.pinned?'1':'0')}</select>
    <button type="submit" class="btn">Save</button><a href="/admin">Cancel</a>
  </form></body></html>`);
});

app.post('/admin/edit/:id', requireAuth, async (req, res) => {
  const stories = await getStories();
  const idx = stories.findIndex(x => x.id === parseInt(req.params.id));
  if (idx === -1) return res.redirect('/admin');
  const { headline, url, source, type, category, pinned } = req.body;
  stories[idx] = { ...stories[idx], headline, url, source, type, category, pinned: pinned === '1' ? 1 : 0 };
  await saveStories(stories);
  res.redirect('/admin');
});

// --- Cron endpoint (called by Vercel Cron or manually) ---
app.get('/api/cron', async (req, res) => {
  // Protect with a secret token in production
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers['authorization'] !== `Bearer ${secret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const { scrape } = require('./scraper');
    const added = await scrape(getStories, saveStories);
    res.json({ ok: true, added });
  } catch (err) {
    console.error('Scrape error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Manual scrape trigger from admin
app.post('/admin/scrape', requireAuth, async (req, res) => {
  try {
    const { scrape } = require('./scraper');
    const added = await scrape(getStories, saveStories);
    res.redirect(`/admin?scraped=${added}`);
  } catch (err) {
    res.redirect('/admin?scrape_error=1');
  }
});

// Only listen when running locally (not on Vercel)
if (!process.env.VERCEL) {
  app.listen(PORT, () => console.log(`\n🗽 New Libertarian running at http://localhost:${PORT}\n`));
}

module.exports = app;
