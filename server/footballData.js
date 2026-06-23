// In-memory cache for match data and computed standings
const fetch = require('node-fetch');
const { canonicalName } = require('./data');

const BASE_URL = 'https://api.football-data.org/v4';
const COMPETITION_CODE = 'WC';

function parseGroup(rawGroup) {
  if (!rawGroup) return null;
  const m = rawGroup.match(/GROUP_([A-L])/i);
  return m ? m[1].toUpperCase() : null;
}

async function fetchMatches(apiKey) {
  const url = `${BASE_URL}/competitions/${COMPETITION_CODE}/matches`;
  const res = await fetch(url, {
    headers: { 'X-Auth-Token': apiKey }
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`football-data.org request failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  const rawMatches = data.matches || [];

  const finishedCount = rawMatches.filter(m => m.status === 'FINISHED').length;
  console.log(`[footballData] total matches: ${rawMatches.length}, finished: ${finishedCount}`);

  const matches = rawMatches.map(m => ({
    id: m.id,
    group: parseGroup(m.group),
    home: canonicalName(m.homeTeam?.name || ''),
    away: canonicalName(m.awayTeam?.name || ''),
    homeScore: m.score?.fullTime?.home,
    awayScore: m.score?.fullTime?.away,
    status: m.status,
    utcDate: m.utcDate,
    stage: m.stage,
    venue: m.venue || null
  }));

  return matches;
}

module.exports = { fetchMatches };