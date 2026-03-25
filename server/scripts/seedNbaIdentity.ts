/**
 * Build-time NBA identity seed: nba_api (Python) or offline stub.
 * Never import this from request-path server code — run via `npm run seed:nba`.
 *
 * Requires: `python3` with `nba-api` (see server/scripts/requirements-nba.txt)
 * Docs: docs/data/seeding-workflow.md
 */

import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);
import * as fs from 'fs/promises';
import * as path from 'path';
import process from 'process';

/** Canonical schema version written into nba-seed.meta.json (v2: NBA stats team/player IDs). */
export const NBA_SEED_SCHEMA_VERSION = 2;

export interface NbaSeedTeam {
  id: number;
  conference: string;
  division: string;
  city: string;
  name: string;
  full_name: string;
  abbreviation: string;
}

export interface NbaSeedPlayer {
  id: number;
  first_name: string;
  last_name: string;
  position: string;
  height: string | null;
  weight: string | null;
  jersey_number: string | null;
  college: string | null;
  country: string | null;
  draft_year: number | null;
  draft_round: number | null;
  draft_number: number | null;
  team_id: number | null;
}

export interface NbaSeedDocument {
  schemaVersion: number;
  teams: NbaSeedTeam[];
  players: NbaSeedPlayer[];
}

export interface NbaSeedMeta {
  schemaVersion: number;
  generatedAt: string;
  source: 'nba_stats_api' | 'offline_static';
  apiBaseUrl: string;
  recordCounts: { teams: number; players: number };
  endpointsUsed: string[];
  dropStats: {
    duplicateIds: number;
    incompleteRows: number;
  };
}

const NBA_STATS_API_BASE = 'https://stats.nba.com';

/** Deterministic offline teams (NBA stats TeamID). Players list empty. */
export const OFFLINE_NBA_TEAMS: NbaSeedTeam[] = [
  { id: 1610612737, conference: 'East', division: 'Southeast', city: 'Atlanta', name: 'Hawks', full_name: 'Atlanta Hawks', abbreviation: 'ATL' },
  { id: 1610612738, conference: 'East', division: 'Atlantic', city: 'Boston', name: 'Celtics', full_name: 'Boston Celtics', abbreviation: 'BOS' },
  { id: 1610612739, conference: 'East', division: 'Central', city: 'Cleveland', name: 'Cavaliers', full_name: 'Cleveland Cavaliers', abbreviation: 'CLE' },
  { id: 1610612740, conference: 'West', division: 'Southwest', city: 'New Orleans', name: 'Pelicans', full_name: 'New Orleans Pelicans', abbreviation: 'NOP' },
  { id: 1610612741, conference: 'East', division: 'Central', city: 'Chicago', name: 'Bulls', full_name: 'Chicago Bulls', abbreviation: 'CHI' },
  { id: 1610612742, conference: 'West', division: 'Southwest', city: 'Dallas', name: 'Mavericks', full_name: 'Dallas Mavericks', abbreviation: 'DAL' },
  { id: 1610612743, conference: 'West', division: 'Northwest', city: 'Denver', name: 'Nuggets', full_name: 'Denver Nuggets', abbreviation: 'DEN' },
  { id: 1610612744, conference: 'West', division: 'Pacific', city: 'San Francisco', name: 'Warriors', full_name: 'Golden State Warriors', abbreviation: 'GSW' },
  { id: 1610612745, conference: 'West', division: 'Southwest', city: 'Houston', name: 'Rockets', full_name: 'Houston Rockets', abbreviation: 'HOU' },
  { id: 1610612746, conference: 'West', division: 'Pacific', city: 'Los Angeles', name: 'Clippers', full_name: 'Los Angeles Clippers', abbreviation: 'LAC' },
  { id: 1610612747, conference: 'West', division: 'Pacific', city: 'Los Angeles', name: 'Lakers', full_name: 'Los Angeles Lakers', abbreviation: 'LAL' },
  { id: 1610612748, conference: 'East', division: 'Southeast', city: 'Miami', name: 'Heat', full_name: 'Miami Heat', abbreviation: 'MIA' },
  { id: 1610612749, conference: 'East', division: 'Central', city: 'Milwaukee', name: 'Bucks', full_name: 'Milwaukee Bucks', abbreviation: 'MIL' },
  { id: 1610612750, conference: 'West', division: 'Northwest', city: 'Minnesota', name: 'Timberwolves', full_name: 'Minnesota Timberwolves', abbreviation: 'MIN' },
  { id: 1610612751, conference: 'East', division: 'Atlantic', city: 'Brooklyn', name: 'Nets', full_name: 'Brooklyn Nets', abbreviation: 'BKN' },
  { id: 1610612752, conference: 'East', division: 'Atlantic', city: 'New York', name: 'Knicks', full_name: 'New York Knicks', abbreviation: 'NYK' },
  { id: 1610612753, conference: 'East', division: 'Southeast', city: 'Orlando', name: 'Magic', full_name: 'Orlando Magic', abbreviation: 'ORL' },
  { id: 1610612754, conference: 'East', division: 'Central', city: 'Indiana', name: 'Pacers', full_name: 'Indiana Pacers', abbreviation: 'IND' },
  { id: 1610612755, conference: 'East', division: 'Atlantic', city: 'Philadelphia', name: '76ers', full_name: 'Philadelphia 76ers', abbreviation: 'PHI' },
  { id: 1610612756, conference: 'West', division: 'Pacific', city: 'Phoenix', name: 'Suns', full_name: 'Phoenix Suns', abbreviation: 'PHX' },
  { id: 1610612757, conference: 'West', division: 'Northwest', city: 'Portland', name: 'Trail Blazers', full_name: 'Portland Trail Blazers', abbreviation: 'POR' },
  { id: 1610612758, conference: 'West', division: 'Pacific', city: 'Sacramento', name: 'Kings', full_name: 'Sacramento Kings', abbreviation: 'SAC' },
  { id: 1610612759, conference: 'West', division: 'Southwest', city: 'San Antonio', name: 'Spurs', full_name: 'San Antonio Spurs', abbreviation: 'SAS' },
  { id: 1610612760, conference: 'West', division: 'Northwest', city: 'Oklahoma City', name: 'Thunder', full_name: 'Oklahoma City Thunder', abbreviation: 'OKC' },
  { id: 1610612761, conference: 'East', division: 'Atlantic', city: 'Toronto', name: 'Raptors', full_name: 'Toronto Raptors', abbreviation: 'TOR' },
  { id: 1610612762, conference: 'West', division: 'Northwest', city: 'Utah', name: 'Jazz', full_name: 'Utah Jazz', abbreviation: 'UTA' },
  { id: 1610612763, conference: 'West', division: 'Southwest', city: 'Memphis', name: 'Grizzlies', full_name: 'Memphis Grizzlies', abbreviation: 'MEM' },
  { id: 1610612764, conference: 'East', division: 'Southeast', city: 'Washington', name: 'Wizards', full_name: 'Washington Wizards', abbreviation: 'WAS' },
  { id: 1610612765, conference: 'East', division: 'Central', city: 'Detroit', name: 'Pistons', full_name: 'Detroit Pistons', abbreviation: 'DET' },
  { id: 1610612766, conference: 'East', division: 'Southeast', city: 'Charlotte', name: 'Hornets', full_name: 'Charlotte Hornets', abbreviation: 'CHA' },
];

interface PythonSeedPayload {
  teams: NbaSeedTeam[];
  players: NbaSeedPlayer[];
  endpointsUsed: string[];
  dropStats: { duplicateIds: number; incompleteRows: number };
}

function parseArgs(): { offline: boolean; season: string } {
  const offline = process.argv.includes('--offline');
  let season = '2025-26';
  const idx = process.argv.indexOf('--season');
  if (idx >= 0 && process.argv[idx + 1]) {
    season = process.argv[idx + 1];
  }
  return { offline, season };
}

function validateSeedDoc(doc: NbaSeedDocument): void {
  if (doc.schemaVersion !== NBA_SEED_SCHEMA_VERSION) {
    throw new Error(`Unexpected schemaVersion in memory: ${doc.schemaVersion}`);
  }
  if (!Array.isArray(doc.teams) || !Array.isArray(doc.players)) {
    throw new Error('Seed document must have teams[] and players[] arrays');
  }
}

function scriptPath(): string {
  return path.join(__dirname, 'seed_nba_identity.py');
}

async function runPythonIdentitySeed(season: string): Promise<PythonSeedPayload> {
  const py = scriptPath();
  try {
    await fs.access(py);
  } catch {
    throw new Error(
      `Missing ${py}. Ensure server/scripts/seed_nba_identity.py exists.`,
    );
  }

  const pythonBin = process.env.PYTHON?.trim() || 'python3';
  const { stdout, stderr } = await execFileAsync(pythonBin, [py, '--season', season], {
    maxBuffer: 50 * 1024 * 1024,
    env: { ...process.env },
  });
  if (stderr?.trim()) {
    console.warn(stderr);
  }

  const parsed = JSON.parse(stdout) as PythonSeedPayload;
  if (!parsed.teams || !parsed.players || !parsed.dropStats) {
    throw new Error('Python seed returned invalid JSON shape');
  }
  return parsed;
}

export async function buildSeedDocument(opts: {
  offline: boolean;
  season?: string;
}): Promise<{ doc: NbaSeedDocument; meta: NbaSeedMeta; endpointsUsed: string[] }> {
  const season = opts.season ?? '2025-26';

  if (opts.offline) {
    const doc: NbaSeedDocument = {
      schemaVersion: NBA_SEED_SCHEMA_VERSION,
      teams: [...OFFLINE_NBA_TEAMS].sort((a, b) => a.id - b.id),
      players: [],
    };
    validateSeedDoc(doc);
    return {
      doc,
      meta: {
        schemaVersion: NBA_SEED_SCHEMA_VERSION,
        generatedAt: new Date().toISOString(),
        source: 'offline_static',
        apiBaseUrl: NBA_STATS_API_BASE,
        recordCounts: { teams: doc.teams.length, players: doc.players.length },
        endpointsUsed: [],
        dropStats: { duplicateIds: 0, incompleteRows: 0 },
      },
      endpointsUsed: [],
    };
  }

  const payload = await runPythonIdentitySeed(season);
  const doc: NbaSeedDocument = {
    schemaVersion: NBA_SEED_SCHEMA_VERSION,
    teams: payload.teams,
    players: payload.players,
  };
  validateSeedDoc(doc);

  return {
    doc,
    meta: {
      schemaVersion: NBA_SEED_SCHEMA_VERSION,
      generatedAt: new Date().toISOString(),
      source: 'nba_stats_api',
      apiBaseUrl: NBA_STATS_API_BASE,
      recordCounts: { teams: doc.teams.length, players: doc.players.length },
      endpointsUsed: payload.endpointsUsed,
      dropStats: payload.dropStats,
    },
    endpointsUsed: payload.endpointsUsed,
  };
}

async function writeArtifacts(rootDir: string, doc: NbaSeedDocument, meta: NbaSeedMeta): Promise<void> {
  const dataDir = path.join(rootDir, 'server', 'data');
  await fs.mkdir(dataDir, { recursive: true });
  await fs.writeFile(path.join(dataDir, 'nba-seed.json'), `${JSON.stringify(doc, null, 2)}\n`, 'utf-8');
  await fs.writeFile(path.join(dataDir, 'nba-seed.meta.json'), `${JSON.stringify(meta, null, 2)}\n`, 'utf-8');
}

async function main(): Promise<void> {
  const { offline, season } = parseArgs();
  const rootDir = path.resolve(__dirname, '..', '..');

  console.log(
    `[seed:nba] mode=${offline ? 'offline_static' : 'nba_stats_api'} schema=${NBA_SEED_SCHEMA_VERSION} season=${season}`,
  );
  const { doc, meta } = await buildSeedDocument({ offline, season });
  await writeArtifacts(rootDir, doc, meta);
  console.log(
    `[seed:nba] wrote server/data/nba-seed.json teams=${doc.teams.length} players=${doc.players.length}`,
  );
  console.log(`[seed:nba] meta source=${meta.source} at ${meta.generatedAt}`);
}

function isDirectSeedInvocation(): boolean {
  return process.argv.some((arg) => /seedNbaIdentity\.(ts|js|cjs|mjs)$/.test(arg));
}

if (isDirectSeedInvocation()) {
  void main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
