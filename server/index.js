// REST API routes
require('dotenv').config();
const express = require('express');
const path = require('path');

const { fetchMatches } = require('./footballData');
const {
  buildStandings, computeRatings, buildR32, runSimulation,
  predictGroupScores, buildScoredBracket
} = require('./simulation');
const { GROUPS, INITIAL_RATINGS, COUNTRY_CODES, venueForMatch, FIXED_VENUES } = require('./data');

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.FOOTBALL_DATA_API_KEY;
const REFRESH_INTERVAL_MS = parseInt(process.env.REFRESH_INTERVAL_MS || '60000', 10);

if (!API_KEY || API_KEY === 'your_api_key_here') {
  console.warn('\nWARNING: FOOTBALL_DATA_API_KEY is not set.');
  console.warn('Get a free key at https://www.football-data.org/client/register');
  console.warn('and add it to a .env file (see .env.example).\n');
  console.warn('The server will run with seed data only until a key is provided.\n');
}

let cache = {
  matches: [],
  ratings: { ...INITIAL_RATINGS },
  standings: buildStandings([], INITIAL_RATINGS),
  lastUpdated: null,
  lastError: null
};

function recompute(matches) {
  const ratings = computeRatings(matches);
  const standings = buildStandings(matches, ratings);
  cache = { matches, ratings, standings, lastUpdated: new Date().toISOString(), lastError: null };
}

async function refresh() {
  if (!API_KEY || API_KEY === 'your_api_key_here') return;
  try {
    const matches = await fetchMatches(API_KEY);
    recompute(matches);
    console.log(`[${new Date().toISOString()}] Refreshed: ${matches.length} matches loaded.`);
  } catch (err) {
    cache.lastError = err.message;
    console.error(`[${new Date().toISOString()}] Refresh failed:`, err.message);
  }
}

refresh();
setInterval(refresh, REFRESH_INTERVAL_MS);

app.get('/api/standings', (req, res) => {
  res.json({
    groups: GROUPS,
    standings: cache.standings,
    ratings: cache.ratings,
    countryCodes: COUNTRY_CODES,
    lastUpdated: cache.lastUpdated,
    lastError: cache.lastError,
    apiKeyConfigured: !!(API_KEY && API_KEY !== 'your_api_key_here')
  });
});

app.get('/api/matches', (req, res) => {
  res.json({ matches: cache.matches, countryCodes: COUNTRY_CODES, lastUpdated: cache.lastUpdated });
});

app.get('/api/simulate', (req, res) => {
  const numSims = Math.min(Math.max(parseInt(req.query.sims || '8000', 10), 1000), 30000);
  try {
    const r32 = buildR32(cache.standings);
    const result = runSimulation(r32, numSims);
    res.json({ ...result, r32, countryCodes: COUNTRY_CODES, lastUpdated: cache.lastUpdated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/predict/groups', (req, res) => {
  try {
    const predictions = predictGroupScores(cache.matches, cache.ratings);
    res.json({ predictions, countryCodes: COUNTRY_CODES, lastUpdated: cache.lastUpdated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/predict/bracket', (req, res) => {
  try {
    const r32 = buildR32(cache.standings);
    const rounds = buildScoredBracket(r32, cache.ratings);

    const roundsWithVenues = rounds.map(round => ({
      key: round.key,
      matches: round.matches.map((m, idx) => {
        const v = venueForMatch(round.key, idx);
        return {
          ...m,
          venue: v ? v.venue : null,
          venueDate: v ? v.date : null,
          matchNumber: v ? v.match : null
        };
      })
    }));

    const sfRound = rounds.find(r => r.key === 'sf');
    if (sfRound) {
      const losers = sfRound.matches.map(m => m.a.name === m.winner.name ? m.b : m.a);
      const tp = FIXED_VENUES.thirdPlace;
      roundsWithVenues.push({
        key: 'thirdPlace',
        matches: [{
          a: losers[0], b: losers[1],
          score: null,
          winner: null,
          venue: tp.venue,
          venueDate: tp.date,
          matchNumber: tp.match
        }]
      });
    }

    res.json({
      rounds: roundsWithVenues,
      countryCodes: COUNTRY_CODES,
      lastUpdated: cache.lastUpdated
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/refresh', async (req, res) => {
  await refresh();
  res.json({ lastUpdated: cache.lastUpdated, lastError: cache.lastError });
});

app.use(express.static(path.join(__dirname, '..', 'public')));

app.listen(PORT, () => {
  console.log(`World Cup 2026 knockout simulator running at http://localhost:${PORT}`);
});