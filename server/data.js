const GROUPS = {
  A: ['Mexico', 'South Africa', 'South Korea', 'Czechia'],
  B: ['Canada', 'Bosnia and Herzegovina', 'Qatar', 'Switzerland'],
  C: ['Brazil', 'Morocco', 'Haiti', 'Scotland'],
  D: ['United States', 'Paraguay', 'Australia', 'Turkiye'],
  E: ['Germany', 'Curacao', 'Ivory Coast', 'Ecuador'],
  F: ['Netherlands', 'Japan', 'Sweden', 'Tunisia'],
  G: ['Belgium', 'Egypt', 'Iran', 'New Zealand'],
  H: ['Spain', 'Cabo Verde', 'Saudi Arabia', 'Uruguay'],
  I: ['France', 'Senegal', 'Iraq', 'Norway'],
  J: ['Argentina', 'Algeria', 'Austria', 'Jordan'],
  K: ['Portugal', 'Congo DR', 'Uzbekistan', 'Colombia'],
  L: ['England', 'Croatia', 'Ghana', 'Panama']
};

const INITIAL_RATINGS = {
  Argentina: 1875, Spain: 1876, France: 1877, England: 1826,
  Portugal: 1764, Brazil: 1761, Netherlands: 1758, Morocco: 1756,
  Belgium: 1735, Germany: 1730, Croatia: 1717, Italy: 1700,
  Colombia: 1693, Senegal: 1689, Mexico: 1681, 'United States': 1673,
  Uruguay: 1673, Japan: 1660, Switzerland: 1649, Denmark: 1621,
  Ecuador: 1500, Norway: 1500, Sweden: 1500, 'Ivory Coast': 1500,
  Austria: 1530, 'South Korea': 1530, Turkiye: 1530, Canada: 1500,
  'Bosnia and Herzegovina': 1470, Egypt: 1470, Ghana: 1470, Iran: 1480,
  Algeria: 1490, Tunisia: 1480, Paraguay: 1480, Czechia: 1490,
  Scotland: 1490, Australia: 1430, 'South Africa': 1430,
  'New Zealand': 1380, Qatar: 1380, 'Cabo Verde': 1380,
  'Saudi Arabia': 1400, Iraq: 1380, Jordan: 1400, 'Congo DR': 1380,
  Uzbekistan: 1380, Panama: 1400, Curacao: 1340, Haiti: 1330
};

const NAME_ALIASES = {
  'Korea Republic': 'South Korea',
  'Czech Republic': 'Czechia',
  'IR Iran': 'Iran',
  'DR Congo': 'Congo DR',
  'Cape Verde': 'Cabo Verde',
  'Cape Verde Islands': 'Cabo Verde',
  'USA': 'United States',
  'Bosnia & Herzegovina': 'Bosnia and Herzegovina',
  'Bosnia-Herzegovina': 'Bosnia and Herzegovina',
  'Turkey': 'Turkiye',
  "Côte d'Ivoire": 'Ivory Coast',
  'Curaçao': 'Curacao'
};

const COUNTRY_CODES = {
  Argentina: 'ar', Spain: 'es', France: 'fr', England: 'gb-eng',
  Portugal: 'pt', Brazil: 'br', Netherlands: 'nl', Morocco: 'ma',
  Belgium: 'be', Germany: 'de', Croatia: 'hr', Italy: 'it',
  Colombia: 'co', Senegal: 'sn', Mexico: 'mx', 'United States': 'us',
  Uruguay: 'uy', Japan: 'jp', Switzerland: 'ch', Denmark: 'dk',
  Ecuador: 'ec', Norway: 'no', Sweden: 'se', 'Ivory Coast': 'ci',
  Austria: 'at', 'South Korea': 'kr', Turkiye: 'tr', Canada: 'ca',
  'Bosnia and Herzegovina': 'ba', Egypt: 'eg', Ghana: 'gh', Iran: 'ir',
  Algeria: 'dz', Tunisia: 'tn', Paraguay: 'py', Czechia: 'cz',
  Scotland: 'gb-sct', Australia: 'au', 'South Africa': 'za',
  'New Zealand': 'nz', Qatar: 'qa', 'Cabo Verde': 'cv',
  'Saudi Arabia': 'sa', Iraq: 'iq', Jordan: 'jo', 'Congo DR': 'cd',
  Uzbekistan: 'uz', Panama: 'pa', Curacao: 'cw', Haiti: 'ht'
};

const R32_SCHEDULE = [
  { match: 73, date: 'Jun 28', venue: 'Los Angeles Stadium (SoFi Stadium), Inglewood' },
  { match: 74, date: 'Jun 29', venue: 'Boston Stadium (Gillette Stadium), Foxborough' },
  { match: 75, date: 'Jun 29', venue: 'Monterrey Stadium (Estadio BBVA), Guadalupe' },
  { match: 76, date: 'Jun 29', venue: 'Houston Stadium (NRG Stadium), Houston' },
  { match: 77, date: 'Jun 30', venue: 'New York New Jersey Stadium (MetLife Stadium), East Rutherford' },
  { match: 78, date: 'Jun 30', venue: 'Dallas Stadium (AT&T Stadium), Arlington' },
  { match: 79, date: 'Jun 30', venue: 'Mexico City Stadium (Estadio Azteca), Mexico City' },
  { match: 80, date: 'Jul 1',  venue: 'Atlanta Stadium (Mercedes-Benz Stadium), Atlanta' },
  { match: 81, date: 'Jul 1',  venue: "San Francisco Bay Area Stadium (Levi's Stadium), Santa Clara" },
  { match: 82, date: 'Jul 1',  venue: 'Seattle Stadium (Lumen Field), Seattle' },
  { match: 83, date: 'Jul 2',  venue: 'Toronto Stadium (BMO Field), Toronto' },
  { match: 84, date: 'Jul 2',  venue: 'Los Angeles Stadium (SoFi Stadium), Inglewood' },
  { match: 85, date: 'Jul 2',  venue: 'Vancouver Stadium (BC Place), Vancouver' },
  { match: 86, date: 'Jul 3',  venue: 'Miami Stadium (Hard Rock Stadium), Miami Gardens' },
  { match: 87, date: 'Jul 3',  venue: 'Kansas City Stadium (Arrowhead Stadium), Kansas City' },
  { match: 88, date: 'Jul 3',  venue: 'Dallas Stadium (AT&T Stadium), Arlington' }
];

const R16_SCHEDULE = [
  { match: 89, date: 'Jul 4', venue: 'Philadelphia Stadium (Lincoln Financial Field), Philadelphia' },
  { match: 90, date: 'Jul 4', venue: 'Houston Stadium (NRG Stadium), Houston' },
  { match: 91, date: 'Jul 5', venue: 'New York New Jersey Stadium (MetLife Stadium), East Rutherford' },
  { match: 92, date: 'Jul 5', venue: 'Mexico City Stadium (Estadio Azteca), Mexico City' },
  { match: 93, date: 'Jul 6', venue: 'Dallas Stadium (AT&T Stadium), Arlington' },
  { match: 94, date: 'Jul 6', venue: 'Seattle Stadium (Lumen Field), Seattle' },
  { match: 95, date: 'Jul 7', venue: 'Atlanta Stadium (Mercedes-Benz Stadium), Atlanta' },
  { match: 96, date: 'Jul 7', venue: 'Vancouver Stadium (BC Place), Vancouver' }
];

const QF_SCHEDULE = [
  { match: 97,  date: 'Jul 9',  venue: 'Boston Stadium (Gillette Stadium), Foxborough' },
  { match: 98,  date: 'Jul 10', venue: 'Los Angeles Stadium (SoFi Stadium), Inglewood' },
  { match: 99,  date: 'Jul 11', venue: 'Miami Stadium (Hard Rock Stadium), Miami Gardens' },
  { match: 100, date: 'Jul 11', venue: 'Kansas City Stadium (Arrowhead Stadium), Kansas City' }
];

const SF_SCHEDULE = [
  { match: 101, date: 'Jul 14', venue: 'Dallas Stadium (AT&T Stadium), Arlington' },
  { match: 102, date: 'Jul 15', venue: 'Atlanta Stadium (Mercedes-Benz Stadium), Atlanta' }
];

const FIXED_VENUES = {
  final:      { match: 104, date: 'Jul 19', venue: 'New York New Jersey Stadium (MetLife Stadium), East Rutherford' },
  thirdPlace: { match: 103, date: 'Jul 18', venue: 'Miami Stadium (Hard Rock Stadium), Miami Gardens' }
};

function canonicalName(name) { return NAME_ALIASES[name] || name; }

function flagUrl(teamName) {
  const code = COUNTRY_CODES[teamName];
  if (!code) return null;
  return `https://flagcdn.com/w80/${code}.png`;
}

function venueForMatch(roundKey, matchIndex) {
  const schedules = { r32: R32_SCHEDULE, r16: R16_SCHEDULE, qf: QF_SCHEDULE, sf: SF_SCHEDULE };
  if (roundKey === 'final') return FIXED_VENUES.final;
  if (roundKey === 'thirdPlace') return FIXED_VENUES.thirdPlace;
  const schedule = schedules[roundKey];
  if (!schedule) return null;
  return schedule[matchIndex % schedule.length];
}

module.exports = {
  GROUPS, INITIAL_RATINGS, NAME_ALIASES, canonicalName,
  COUNTRY_CODES, flagUrl, R32_SCHEDULE, R16_SCHEDULE, QF_SCHEDULE, SF_SCHEDULE,
  FIXED_VENUES, venueForMatch
};