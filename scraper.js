const Parser = require('rss-parser');
const parser = new Parser({ timeout: 10000 });

const MAX_STORIES = 200;

const FEEDS = [
  { url: 'https://www.antiwar.com/blog/feed/', source: 'Antiwar.com', defaultCategory: 'war' },
  { url: 'https://reason.com/feed/', source: 'Reason', defaultCategory: 'government' },
  { url: 'https://mises.org/feed', source: 'Mises Institute', defaultCategory: 'economy' },
  { url: 'https://www.theamericanconservative.com/feed/', source: 'The American Conservative', defaultCategory: 'war' },
  { url: 'https://www.ronpaulinstitute.org/feed/', source: 'Ron Paul Institute', defaultCategory: 'war' },
  { url: 'https://libertarianinstitute.org/feed/', source: 'Libertarian Institute', defaultCategory: 'war' },
  { url: 'https://www.cato.org/rss/recent-commentary', source: 'Cato Institute', defaultCategory: 'government' },
  { url: 'https://www.zerohedge.com/fullrss2.xml', source: 'ZeroHedge', defaultCategory: 'economy' },
];

// Keyword-based category detection
function detectCategory(headline) {
  const h = headline.toLowerCase();
  if (/iran|war|troops|military|nato|ukraine|gaza|israel|pentagon|hegseth|drone|missile|bomb|invasion|venezuela|sanctions|foreign policy|regime change|empire|intervention|soldiers|combat|ceasefire|weapons|arms/.test(h)) return 'war';
  if (/inflation|recession|gdp|jobs|unemployment|oil|gas price|fed |federal reserve|dollar|debt|deficit|market|economy|economic|tariff|trade|budget|spending|fiscal/.test(h)) return 'economy';
  if (/billion|trillion|congress|appropriat|budget|doge|pentagon audit|waste|fraud|entitlement|welfare|foreign aid|subsidies/.test(h)) return 'spending';
  if (/trump|democrat|republican|senate|house|election|maga|libertarian|gop|vote|primary|campaign|politician|legislation/.test(h)) return 'politics';
  if (/fbi|cia|nsa|surveillance|civil liberties|free speech|censorship|regulation|government|federal|agency|bureauc|executive order|constitution|rights/.test(h)) return 'government';
  return 'general';
}

// Filter out stories that don't fit the editorial angle
function isRelevant(headline) {
  const h = headline.toLowerCase();
  // Skip pure sports, entertainment, lifestyle fluff
  if (/nfl|nba|mlb|nhl|soccer|celebrity|kardashian|taylor swift|oscars|grammy|recipe|fashion|horoscope/.test(h)) return false;
  return true;
}

async function scrape(getStories, saveStories) {
  const existing = await getStories();
  const existingUrls = new Set(existing.map(s => s.url));
  const newStories = [];

  for (const feed of FEEDS) {
    try {
      const result = await parser.parseURL(feed.url);
      for (const item of result.items.slice(0, 20)) {
        const url = item.link || item.guid;
        const headline = item.title?.trim();
        if (!url || !headline) continue;
        if (existingUrls.has(url)) continue;
        if (!isRelevant(headline)) continue;

        const category = detectCategory(headline);
        newStories.push({
          id: Date.now() + Math.random(),
          headline,
          url,
          source: feed.source,
          type: 'article',
          category,
          pinned: false,
          created_at: item.isoDate || new Date().toISOString()
        });
        existingUrls.add(url);
      }
    } catch (err) {
      console.warn(`Feed failed: ${feed.url} — ${err.message}`);
    }
  }

  if (newStories.length === 0) {
    console.log('No new stories found.');
    return 0;
  }

  // Merge: new stories first, keep pinned, cap at MAX_STORIES
  const pinned = existing.filter(s => s.pinned);
  const unpinned = existing.filter(s => !s.pinned);
  const combined = [...newStories, ...unpinned].slice(0, MAX_STORIES - pinned.length);
  const final = [...pinned, ...combined];

  await saveStories(final);
  console.log(`Added ${newStories.length} new stories. Total: ${final.length}`);
  return newStories.length;
}

module.exports = { scrape };
