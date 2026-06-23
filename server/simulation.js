const { GROUPS, INITIAL_RATINGS } = require('./data');

function eloUpdate(ratingA, ratingB, scoreA, scoreB) {
  const expectedA = 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
  let actualA;
  if (scoreA > scoreB) actualA = 1;
  else if (scoreA < scoreB) actualA = 0;
  else actualA = 0.5;
  const K = 30;
  const marginMult = 1 + Math.min(Math.abs(scoreA - scoreB), 3) * 0.15;
  const delta = K * marginMult * (actualA - expectedA);
  return [ratingA + delta, ratingB - delta];
}

function computeRatings(matches) {
  const ratings = { ...INITIAL_RATINGS };
  const finished = matches
    .filter(m => m.status === 'FINISHED')
    .sort((a, b) => new Date(a.utcDate) - new Date(b.utcDate));
  for (const m of finished) {
    if (!(m.home in ratings) || !(m.away in ratings)) continue;
    const [rh, ra] = eloUpdate(ratings[m.home], ratings[m.away], m.homeScore, m.awayScore);
    ratings[m.home] = rh;
    ratings[m.away] = ra;
  }
  return ratings;
}

function matchProb(ratingA, ratingB) {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

function groupMatchups(teams) {
  const pairs = [];
  for (let i = 0; i < teams.length; i++)
    for (let j = i + 1; j < teams.length; j++)
      pairs.push([teams[i], teams[j]]);
  return pairs;
}

function buildGroupStandings(groupLetter, teams, matches, ratings) {
  const rows = {};
  for (const name of teams) {
    rows[name] = { name, rating: ratings[name] || 1400, pts: 0, gf: 0, ga: 0, gd: 0, played: 0, simPts: 0 };
  }

  const groupMatches = matches.filter(m => m.group === groupLetter);
  const playedPairs = new Set();

  for (const m of groupMatches) {
    if (m.status !== 'FINISHED') continue;
    const home = rows[m.home], away = rows[m.away];
    if (!home || !away) continue;

    home.played++; away.played++;
    home.gf += m.homeScore; home.ga += m.awayScore;
    away.gf += m.awayScore; away.ga += m.homeScore;

    if (m.homeScore > m.awayScore) home.pts += 3;
    else if (m.homeScore < m.awayScore) away.pts += 3;
    else { home.pts += 1; away.pts += 1; }

    playedPairs.add([m.home, m.away].sort().join('|'));
    playedPairs.add([m.away, m.home].sort().join('|'));
  }

  const DRAW_PROB = 0.22;
  for (const [a, b] of groupMatchups(teams)) {
    const key = [a, b].sort().join('|');
    if (playedPairs.has(key)) continue;
    const rA = ratings[a] || 1400, rB = ratings[b] || 1400;
    const pA = matchProb(rA, rB);
    const pB = 1 - pA;
    const pWinA = pA * (1 - DRAW_PROB), pWinB = pB * (1 - DRAW_PROB);
    rows[a].simPts += pWinA * 3 + DRAW_PROB * 1;
    rows[b].simPts += pWinB * 3 + DRAW_PROB * 1;
  }

  const arr = Object.values(rows);
  arr.forEach(t => { t.gd = t.gf - t.ga; });
  arr.sort((a, b) =>
    (b.pts + b.simPts) - (a.pts + a.simPts) ||
    b.gd - a.gd || b.gf - a.gf || b.rating - a.rating
  );

  return arr;
}

function buildStandings(matches, ratings) {
  const standings = {};
  for (const [group, teams] of Object.entries(GROUPS)) {
    standings[group] = buildGroupStandings(group, teams, matches, ratings);
  }
  return standings;
}

function buildR32(standings) {
  const W = (g) => ({ ...standings[g][0], group: g, pos: 'winner' });
  const R = (g) => ({ ...standings[g][1], group: g, pos: 'runnerup' });

  const thirds = Object.keys(standings).map(g => ({ ...standings[g][2], group: g, pos: 'third' }));
  thirds.sort((a, b) =>
    (b.pts + b.simPts) - (a.pts + a.simPts) ||
    b.gd - a.gd || b.gf - a.gf || b.rating - a.rating
  );
  const best8thirds = thirds.slice(0, 8);
  best8thirds.sort((a, b) => a.group.localeCompare(b.group));

  let thirdIdx = 0;
  const nextThird = () => {
    const t = best8thirds[thirdIdx % best8thirds.length];
    thirdIdx++;
    return t;
  };

  const pairs = [
    [R('B'), R('A')],       // M73 — Los Angeles
    [W('E'), nextThird()],  // M74 — Boston
    [W('F'), R('C')],       // M75 — Monterrey
    [W('C'), R('F')],       // M76 — Houston
    [W('I'), nextThird()],  // M77 — New York NJ
    [R('E'), R('I')],       // M78 — Dallas
    [W('A'), nextThird()],  // M79 — Mexico City
    [W('L'), nextThird()],  // M80 — Atlanta
    [W('D'), nextThird()],  // M81 — San Francisco
    [W('G'), nextThird()],  // M82 — Seattle
    [R('K'), R('L')],       // M83 — Toronto
    [W('H'), R('J')],       // M84 — Los Angeles
    [W('B'), nextThird()],  // M85 — Vancouver
    [W('J'), R('H')],       // M86 — Miami
    [W('K'), nextThird()],  // M87 — Kansas City
    [R('D'), R('G')],       // M88 — Dallas
  ];

  return pairs.map(([a, b]) => [
    { name: a.name, rating: a.rating, seedGroup: a.group, seedPos: a.pos },
    { name: b.name, rating: b.rating, seedGroup: b.group, seedPos: b.pos }
  ]);
}

function playMatch(teamA, teamB) {
  const pA = matchProb(teamA.rating, teamB.rating);
  return Math.random() < pA ? teamA : teamB;
}

function runSimulation(r32, numSims = 10000) {
  const teamSeedGroup = {};
  r32.forEach(pair => {
    teamSeedGroup[pair[0].name] = pair[0].seedGroup;
    teamSeedGroup[pair[1].name] = pair[1].seedGroup;
  });

  const allTeamNames = new Set();
  r32.forEach(pair => { allTeamNames.add(pair[0].name); allTeamNames.add(pair[1].name); });

  const counts = {};
  allTeamNames.forEach(name => {
    counts[name] = { r32: 0, r16: 0, qf: 0, sf: 0, final: 0, champion: 0 };
  });

  const matchupCounts = { r32: {}, r16: {}, qf: {}, sf: {}, final: {} };

  for (let s = 0; s < numSims; s++) {
    let round = r32.map(pair => [pair[0], pair[1]]);
    round.flat().forEach(t => counts[t.name].r32++);

    const advance = (pairs, roundKey) => {
      const winners = [];
      for (const pair of pairs) {
        const key = [pair[0].name, pair[1].name].sort().join(' vs ');
        if (!matchupCounts[roundKey][key]) {
          matchupCounts[roundKey][key] = { teamA: pair[0].name, teamB: pair[1].name, aWins: 0, bWins: 0 };
        }
        const winner = playMatch(pair[0], pair[1]);
        const mc = matchupCounts[roundKey][key];
        if (winner.name === mc.teamA) mc.aWins++; else mc.bWins++;
        winners.push(winner);
      }
      return winners;
    };

    let winners = advance(round, 'r32');
    winners.forEach(t => counts[t.name].r16++);

    const r16Pairs = [];
    for (let i = 0; i < winners.length; i += 2) r16Pairs.push([winners[i], winners[i + 1]]);
    winners = advance(r16Pairs, 'r16');
    winners.forEach(t => counts[t.name].qf++);

    const qfPairs = [];
    for (let i = 0; i < winners.length; i += 2) qfPairs.push([winners[i], winners[i + 1]]);
    winners = advance(qfPairs, 'qf');
    winners.forEach(t => counts[t.name].sf++);

    const sfPairs = [];
    for (let i = 0; i < winners.length; i += 2) sfPairs.push([winners[i], winners[i + 1]]);
    winners = advance(sfPairs, 'sf');
    winners.forEach(t => counts[t.name].final++);

    const finalPair = [[winners[0], winners[1]]];
    const champion = advance(finalPair, 'final')[0];
    counts[champion.name].champion++;
  }

  const teamResults = Object.entries(counts).map(([name, c]) => ({
    name,
    seedGroup: teamSeedGroup[name] || '?',
    r32: (c.r32 / numSims) * 100,
    r16: (c.r16 / numSims) * 100,
    qf: (c.qf / numSims) * 100,
    sf: (c.sf / numSims) * 100,
    final: (c.final / numSims) * 100,
    champion: (c.champion / numSims) * 100
  })).sort((a, b) => b.champion - a.champion);

  const matchupResults = {};
  for (const roundKey of Object.keys(matchupCounts)) {
    matchupResults[roundKey] = Object.values(matchupCounts[roundKey]).map(m => {
      const total = m.aWins + m.bWins;
      return {
        teamA: m.teamA, teamB: m.teamB,
        aPct: total > 0 ? (m.aWins / total) * 100 : 50,
        bPct: total > 0 ? (m.bWins / total) * 100 : 50,
        occurRate: (total / numSims) * 100
      };
    }).sort((a, b) => b.occurRate - a.occurRate);
  }

  return { teamResults, matchupResults, numSims };
}

const LEAGUE_AVG_GOALS = 1.3;

function expectedGoals(ratingFor, ratingAgainst, isHome) {
  const diff = (ratingFor - ratingAgainst) / 200;
  const attackMultiplier = Math.exp(diff * 0.35);
  const homeBonus = isHome ? 1.12 : 0.92;
  return Math.min(4.2, Math.max(0.25, LEAGUE_AVG_GOALS * attackMultiplier * homeBonus));
}

function poissonPMF(k, lambda) {
  let logP = -lambda + k * Math.log(lambda);
  for (let i = 2; i <= k; i++) logP -= Math.log(i);
  return Math.exp(logP);
}

function predictScore(ratingHome, ratingAway, allowDraw = true) {
  const lambdaHome = expectedGoals(ratingHome, ratingAway, true);
  const lambdaAway = expectedGoals(ratingAway, ratingHome, false);
  const MAX_GOALS = 6;

  let bestHome = 0, bestAway = 0, bestP = -1;
  for (let h = 0; h <= MAX_GOALS; h++) {
    for (let a = 0; a <= MAX_GOALS; a++) {
      if (!allowDraw && h === a) continue;
      const p = poissonPMF(h, lambdaHome) * poissonPMF(a, lambdaAway);
      if (p > bestP) { bestP = p; bestHome = h; bestAway = a; }
    }
  }

  // For group stage: if best scoreline is a draw, nudge toward
  // a result reflecting each team's actual expected goals
  if (allowDraw && bestHome === bestAway) {
    if (lambdaHome >= lambdaAway) {
      bestHome = Math.round(lambdaHome);
      bestAway = Math.max(0, Math.round(lambdaAway) - (bestHome === Math.round(lambdaAway) ? 1 : 0));
    } else {
      bestAway = Math.round(lambdaAway);
      bestHome = Math.max(0, Math.round(lambdaHome) - (bestAway === Math.round(lambdaHome) ? 1 : 0));
    }
    if (bestHome === bestAway) {
      if (lambdaHome > lambdaAway) bestHome++;
      else bestAway++;
    }
  }

  return { homeScore: bestHome, awayScore: bestAway, confidence: bestP };
}

function predictGroupScores(matches, ratings) {
  return matches
    .filter(m =>
      m.status !== 'FINISHED' &&
      m.group &&
      m.home && m.home.length > 0 &&
      m.away && m.away.length > 0 &&
      ratings[m.home] &&
      ratings[m.away]
    )
    .map(m => {
      const prediction = predictScore(ratings[m.home], ratings[m.away], true);
      return { ...m, predictedHome: prediction.homeScore, predictedAway: prediction.awayScore };
    });
}

function buildScoredBracket(r32, ratings) {
  const roundKeys = ['r32', 'r16', 'qf', 'sf', 'final'];
  let currentTeams = r32.map(pair => ({ a: pair[0], b: pair[1] }));
  const rounds = [];

  for (const key of roundKeys) {
    const matches = currentTeams.map((pair, idx) => {
      const ratingA = pair.a.rating || ratings[pair.a.name] || 1400;
      const ratingB = pair.b.rating || ratings[pair.b.name] || 1400;
      const prediction = predictScore(ratingA, ratingB, false);
      const winner = prediction.homeScore > prediction.awayScore ? pair.a : pair.b;
      return { a: pair.a, b: pair.b, score: { home: prediction.homeScore, away: prediction.awayScore }, winner, matchIndex: idx };
    });
    rounds.push({ key, matches });
    const winners = matches.map(m => m.winner);
    const nextPairs = [];
    for (let i = 0; i < winners.length; i += 2) {
      if (winners[i + 1]) nextPairs.push({ a: winners[i], b: winners[i + 1] });
    }
    currentTeams = nextPairs;
  }

  return rounds;
}

module.exports = {
  buildStandings, computeRatings, buildR32, runSimulation, eloUpdate, matchProb,
  predictScore, predictGroupScores, buildScoredBracket, expectedGoals
};