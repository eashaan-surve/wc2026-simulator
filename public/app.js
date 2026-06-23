const ROUND_LABELS = {
  r32: 'Round of 32', r16: 'Round of 16',
  qf: 'Quarterfinals', sf: 'Semifinals', final: 'Final'
};

let currentState = null;
let countryCodes = {};

function flagImg(name, size) {
  const code = countryCodes[name];
  const px = size || 20;
  if (!code) return '<span class="flag-fallback">🏳️</span>';
  return `<img class="flag-img" src="https://flagcdn.com/w80/${code}.png" alt="${name}" style="width:${px}px" />`;
}

async function fetchStandings() {
  const res = await fetch('/api/standings');
  return res.json();
}

async function fetchMatches() {
  const res = await fetch('/api/matches');
  return res.json();
}

async function fetchSimulation(numSims) {
  const res = await fetch(`/api/simulate?sims=${numSims}`);
  return res.json();
}

async function fetchGroupPredictions() {
  const res = await fetch('/api/predict/groups');
  return res.json();
}

async function fetchBracketPredictions() {
  const res = await fetch('/api/predict/bracket');
  return res.json();
}

function formatTime(iso) {
  if (!iso) return 'never';
  return new Date(iso).toLocaleString();
}

function renderStatus(state, matchesData) {
  const el = document.getElementById('status-text');
  if (!state.apiKeyConfigured) {
    el.textContent = 'No API key — showing seed ratings. Add FOOTBALL_DATA_API_KEY to .env and restart.';
    return;
  }
  if (state.lastError) {
    el.textContent = `Update failed: ${state.lastError} (last OK: ${formatTime(state.lastUpdated)})`;
    return;
  }
  const live = (matchesData?.matches || []).some(m => ['IN_PLAY','LIVE','PAUSED'].includes(m.status));
  el.textContent = `Updated ${formatTime(state.lastUpdated)}${live ? ' · live match in progress' : ''}`;
}

function renderGroupSelect(groups) {
  const sel = document.getElementById('group-select');
  const prev = sel.value;
  sel.innerHTML = '';
  Object.keys(groups).forEach(g => {
    const opt = document.createElement('option');
    opt.value = g;
    opt.textContent = `Group ${g}`;
    sel.appendChild(opt);
  });
  if (prev) sel.value = prev;
}

function getRatingRange(standings) {
  const all = Object.values(standings).flat().map(t => t.rating);
  return { min: Math.min(...all), max: Math.max(...all) };
}

function renderGroup(group, state, matchesData) {
  const container = document.getElementById('group-content');
  const standings = state.standings[group];
  const { min, max } = getRatingRange(state.standings);

  const groupMatches = (matchesData?.matches || []).filter(m => m.group === group);

  let html = '<table><thead><tr>';
  html += '<th style="width:28px"></th><th style="text-align:left">Team</th>';
  html += '<th>P</th><th>Pts</th>';
  html += '<th style="color:var(--gold)">+xPts</th>';
  html += '<th>GD</th><th>GF</th>';
  html += '<th style="min-width:100px">Rating</th>';
  html += '</tr></thead><tbody>';

  standings.forEach((s, i) => {
    const barPct = max > min ? ((s.rating - min) / (max - min)) * 100 : 50;
    const simPts = s.simPts != null ? s.simPts : 0;
    html += `<tr class="${i < 2 ? 'qualified' : ''}">`;
    html += `<td style="color:var(--text-muted);font-size:11px;font-weight:700;text-align:center">${i + 1}</td>`;
    html += `<td style="font-weight:600"><span class="team-cell">${flagImg(s.name, 20)}<span>${s.name}</span></span></td>`;
    html += `<td>${s.played}</td>`;
    html += `<td style="font-weight:700;color:var(--text)">${s.pts}</td>`;
    html += `<td style="color:var(--gold);font-size:12px">+${simPts.toFixed(1)}</td>`;
    html += `<td>${s.gd > 0 ? '+' + s.gd : s.gd}</td>`;
    html += `<td>${s.gf}</td>`;
    html += `<td class="rating-cell">
      <div class="rating-bar" style="width:${barPct}%"></div>
      <span class="rating-val">${Math.round(s.rating)}</span>
    </td>`;
    html += '</tr>';
  });
  html += '</tbody></table>';

  html += '<p class="hint" style="margin-bottom:16px">Gold rows advance · <strong>Pts</strong> = real points · <strong>+xPts</strong> = expected points from remaining games</p>';

  if (groupMatches.length) {
    html += '<div class="fixtures-label">Fixtures</div>';
    html += '<div class="fixtures">';
    groupMatches.forEach(m => {
      const isLive = ['IN_PLAY','LIVE','PAUSED'].includes(m.status);
      const isFinished = m.status === 'FINISHED';
      const score = (isFinished || isLive) ? `${m.homeScore ?? 0} – ${m.awayScore ?? 0}` : '–';
      const statusLabel = isLive ? 'Live' : isFinished ? 'FT' : new Date(m.utcDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      html += `<div class="fixture-row">
        <div class="team home">${flagImg(m.home, 18)}<span>${m.home}</span></div>
        <div class="score${isFinished || isLive ? '' : ' pending'}">${score}</div>
        <div class="team">${flagImg(m.away, 18)}<span>${m.away}</span></div>
        <div class="status-badge${isLive ? ' live' : ''}">${statusLabel}</div>
      </div>`;
      if (m.venue) {
        html += `<div class="venue-line">📍 ${m.venue}</div>`;
      }
    });
    html += '</div>';
  } else {
    html += '<div class="empty">No fixture data yet for this group.</div>';
  }

  container.innerHTML = html;
}

function rankLabel(i) {
  if (i === 0) return '<td class="rank-cell gold">🥇</td>';
  if (i === 1) return '<td class="rank-cell silver">🥈</td>';
  if (i === 2) return '<td class="rank-cell bronze">🥉</td>';
  return `<td class="rank-cell">${i + 1}</td>`;
}

function renderSimulation(data) {
  const container = document.getElementById('sim-results');

  const byGroup = {};
  data.teamResults.forEach(r => {
    const group = r.seedGroup || '?';
    if (!byGroup[group]) byGroup[group] = [];
    byGroup[group].push(r);
  });

  let html = '';

  Object.keys(byGroup).sort().forEach(group => {
    const teams = byGroup[group];
    html += `<div class="sim-section-label">Group ${group}</div>`;
    html += '<table class="sim-table"><thead><tr>';
    html += '<th style="width:28px"></th><th style="text-align:left">Team</th>';
    html += '<th>R16</th><th>QF</th><th>SF</th><th>Final</th><th>Win</th>';
    html += '</tr></thead><tbody>';
    teams.forEach((r, i) => {
      html += `<tr>${rankLabel(i)}`;
      html += `<td style="text-align:left;font-weight:600"><span class="team-cell">${flagImg(r.name, 18)}<span>${r.name}</span></span></td>`;
      html += `<td>${r.r16.toFixed(1)}%</td>`;
      html += `<td>${r.qf.toFixed(1)}%</td>`;
      html += `<td>${r.sf.toFixed(1)}%</td>`;
      html += `<td>${r.final.toFixed(1)}%</td>`;
      html += `<td class="champ" style="color:${i === 0 ? 'var(--gold-light)' : 'var(--text)'}">${r.champion.toFixed(1)}%</td>`;
      html += '</tr>';
    });
    html += '</tbody></table>';
  });

  Object.keys(ROUND_LABELS).forEach(roundKey => {
    const matchups = data.matchupResults[roundKey];
    if (!matchups?.length) return;
    const showOccurrence = roundKey !== 'r32';
    html += `<div class="sim-section-label">${ROUND_LABELS[roundKey]}</div>`;
    html += showOccurrence
      ? '<div class="hint">Ranked by chance the matchup occurs · win odds shown if it does</div>'
      : '<div class="hint">Fixed bracket pairing from current standings · win odds shown</div>';
    html += '<div class="matchup-list">';
    matchups.slice(0, 12).forEach(m => {
      const aFav = m.aPct >= m.bPct;
      html += `<div class="matchup-row">
        <div class="matchup-teams">
          <div class="matchup-team${aFav ? ' fav' : ''}">
            <span class="team-cell">${flagImg(m.teamA, 16)}<span>${m.teamA}</span></span><span class="matchup-pct">${m.aPct.toFixed(0)}%</span>
          </div>
          <div class="matchup-team${!aFav ? ' fav' : ''}">
            <span class="team-cell">${flagImg(m.teamB, 16)}<span>${m.teamB}</span></span><span class="matchup-pct">${m.bPct.toFixed(0)}%</span>
          </div>
        </div>
        <div class="matchup-bar-wrap">
          <div class="matchup-bar-track">
            <div class="matchup-bar-fill${aFav ? '' : ' loser'}" style="width:${m.aPct.toFixed(0)}%"></div>
          </div>
          <div class="matchup-bar-track">
            <div class="matchup-bar-fill${!aFav ? '' : ' loser'}" style="width:${m.bPct.toFixed(0)}%"></div>
          </div>
        </div>
        ${showOccurrence ? `<div class="matchup-occur">${m.occurRate.toFixed(1)}%<span>chance</span></div>` : ''}
      </div>`;
    });
    html += '</div>';
  });

  container.innerHTML = html;
}

function renderGroupPredictions(data) {
  const container = document.getElementById('predictions-content');
  const preds = data.predictions || [];

  if (!preds.length) {
    container.innerHTML = '<div class="empty">No remaining group matches to predict — group stage may be complete.</div>';
    return;
  }

  const byGroup = {};
  preds.forEach(p => {
    const g = p.group || '?';
    if (!byGroup[g]) byGroup[g] = [];
    byGroup[g].push(p);
  });

  let html = '';
  Object.keys(byGroup).sort().forEach(group => {
    html += `<div class="sim-section-label">Group ${group}</div>`;
    html += '<div class="fixtures">';
    byGroup[group].forEach(p => {
      html += `<div class="fixture-row predicted">
        <div class="team home">${flagImg(p.home, 18)}<span>${p.home}</span></div>
        <div class="score predicted-score">${p.predictedHome} – ${p.predictedAway}</div>
        <div class="team">${flagImg(p.away, 18)}<span>${p.away}</span></div>
        <div class="status-badge predicted-badge">PRED</div>
      </div>`;
      if (p.venue) {
        html += `<div class="venue-line">📍 ${p.venue}</div>`;
      }
    });
    html += '</div>';
  });

  container.innerHTML = html;
}

function renderScoredBracket(data) {
  const container = document.getElementById('bracket-content');
  const rounds = data.rounds || [];

  if (!rounds.length) {
    container.innerHTML = '<div class="empty">No bracket data available.</div>';
    return;
  }

  const roundTitles = { r32: 'Round of 32', r16: 'Round of 16', qf: 'Quarterfinals', sf: 'Semifinals', final: 'Final' };

  let html = '<div class="bracket-scroll"><div class="bracket">';
  rounds.forEach(r => {
    html += `<div class="bracket-round"><div class="bracket-round-title">${roundTitles[r.key] || r.key}</div>`;
    r.matches.forEach(m => {
      const aWon = m.winner?.name === m.a.name;
      const scoreLabel = m.score
        ? `${m.score.home} – ${m.score.away}${m.score.penalties ? ' (pens)' : ''}`
        : '';
      html += `<div class="bracket-match scored">
        <div class="bracket-team${aWon ? ' winner' : ''}">${flagImg(m.a.name, 16)}<span>${m.a.name}</span></div>
        <div class="bracket-score-line">${scoreLabel}</div>
        <div class="bracket-team${!aWon ? ' winner' : ''}">${flagImg(m.b.name, 16)}<span>${m.b.name}</span></div>
        ${m.venue ? `<div class="bracket-venue">📍 ${m.venue}</div>` : ''}
      </div>`;
    });
    html += '</div>';
  });

  const lastRound = rounds[rounds.length - 1];
  const champion = lastRound?.matches?.[0]?.winner;
  if (champion) {
    html += `<div class="bracket-round bracket-champion-col"><div class="bracket-round-title">Champion</div><div class="bracket-champion">${flagImg(champion.name, 32)}<div class="bracket-champion-name">🏆 ${champion.name}</div></div></div>`;
  }

  html += '</div></div>';
  html += '<p class="hint" style="margin-top:14px">Predicted scorelines from a Poisson goal model based on Elo ratings. Semifinal, Third Place, and Final venues are FIFA-confirmed; earlier rounds rotate through all 16 official host stadiums.</p>';
  container.innerHTML = html;
}

async function refreshAll() {
  const [state, matchesData] = await Promise.all([fetchStandings(), fetchMatches()]);
  currentState = state;
  countryCodes = state.countryCodes || matchesData.countryCodes || {};
  renderStatus(state, matchesData);
  renderGroupSelect(state.groups);

  const sel = document.getElementById('group-select');
  const selected = sel.value || Object.keys(state.groups)[0];
  sel.value = selected;
  window.__matchesData = matchesData;
  renderGroup(selected, state, matchesData);
}

document.getElementById('group-select').addEventListener('change', e => {
  if (currentState) renderGroup(e.target.value, currentState, window.__matchesData);
});

document.getElementById('refresh-btn').addEventListener('click', async () => {
  document.getElementById('status-text').textContent = 'Refreshing...';
  await fetch('/api/refresh', { method: 'POST' });
  await refreshAll();
});

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
  });
});

const simsRange = document.getElementById('sims-range');
simsRange.addEventListener('input', e => {
  document.getElementById('sims-out').textContent = parseInt(e.target.value).toLocaleString();
});

document.getElementById('run-sim-btn').addEventListener('click', async () => {
  const btn = document.getElementById('run-sim-btn');
  btn.disabled = true; btn.textContent = 'Running...';
  try {
    const data = await fetchSimulation(parseInt(simsRange.value, 10));
    countryCodes = data.countryCodes || countryCodes;
    renderSimulation(data);
  } finally {
    btn.disabled = false; btn.textContent = 'Run simulation';
  }
});

document.getElementById('predict-groups-btn').addEventListener('click', async () => {
  const btn = document.getElementById('predict-groups-btn');
  btn.disabled = true; btn.textContent = 'Predicting...';
  try {
    const data = await fetchGroupPredictions();
    countryCodes = data.countryCodes || countryCodes;
    renderGroupPredictions(data);
  } finally {
    btn.disabled = false; btn.textContent = 'Predict remaining group matches';
  }
});

document.getElementById('predict-bracket-btn').addEventListener('click', async () => {
  const btn = document.getElementById('predict-bracket-btn');
  btn.disabled = true; btn.textContent = 'Predicting...';
  try {
    const data = await fetchBracketPredictions();
    countryCodes = data.countryCodes || countryCodes;
    renderScoredBracket(data);
  } finally {
    btn.disabled = false; btn.textContent = 'Predict full bracket';
  }
});

refreshAll();
setInterval(refreshAll, 60000);