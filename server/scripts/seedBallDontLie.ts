/**
 * Build-time BallDontLie seed: fetches NBA teams + players (or writes offline stub).
 * Never import this from request-path server code — run via `npm run seed:nba`.
 *
 * Env: BALLDONTLIE_API_KEY (required unless --offline)
 * Docs: docs/data/seeding-workflow.md
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import process from 'process';
import dotenv from 'dotenv';

/** Repo-root `.env` (monoreparent: server/scripts → ../..). */
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

/** Canonical schema version written into nba-seed.meta.json */
export const NBA_SEED_SCHEMA_VERSION = 1;

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
  source: 'balldontlie_api' | 'offline_static';
  apiBaseUrl: string;
  recordCounts: { teams: number; players: number };
  endpointsUsed: string[];
  dropStats: {
    duplicateIds: number;
    incompleteRows: number;
  };
}

const API_BASE = 'https://api.balldontlie.io/v1';

/** Deterministic offline teams (ids match historical BallDontLie v1 ordering). */
export const OFFLINE_NBA_TEAMS: NbaSeedTeam[] = [
  { id: 1, conference: 'East', division: 'Southeast', city: 'Atlanta', name: 'Hawks', full_name: 'Atlanta Hawks', abbreviation: 'ATL' },
  { id: 2, conference: 'East', division: 'Atlantic', city: 'Boston', name: 'Celtics', full_name: 'Boston Celtics', abbreviation: 'BOS' },
  { id: 3, conference: 'East', division: 'Atlantic', city: 'Brooklyn', name: 'Nets', full_name: 'Brooklyn Nets', abbreviation: 'BKN' },
  { id: 4, conference: 'East', division: 'Southeast', city: 'Charlotte', name: 'Hornets', full_name: 'Charlotte Hornets', abbreviation: 'CHA' },
  { id: 5, conference: 'East', division: 'Central', city: 'Chicago', name: 'Bulls', full_name: 'Chicago Bulls', abbreviation: 'CHI' },
  { id: 6, conference: 'East', division: 'Central', city: 'Cleveland', name: 'Cavaliers', full_name: 'Cleveland Cavaliers', abbreviation: 'CLE' },
  { id: 7, conference: 'West', division: 'Southwest', city: 'Dallas', name: 'Mavericks', full_name: 'Dallas Mavericks', abbreviation: 'DAL' },
  { id: 8, conference: 'West', division: 'Northwest', city: 'Denver', name: 'Nuggets', full_name: 'Denver Nuggets', abbreviation: 'DEN' },
  { id: 9, conference: 'East', division: 'Central', city: 'Detroit', name: 'Pistons', full_name: 'Detroit Pistons', abbreviation: 'DET' },
  { id: 10, conference: 'West', division: 'Pacific', city: 'Golden State', name: 'Warriors', full_name: 'Golden State Warriors', abbreviation: 'GSW' },
  { id: 11, conference: 'West', division: 'Southwest', city: 'Houston', name: 'Rockets', full_name: 'Houston Rockets', abbreviation: 'HOU' },
  { id: 12, conference: 'East', division: 'Central', city: 'Indiana', name: 'Pacers', full_name: 'Indiana Pacers', abbreviation: 'IND' },
  { id: 13, conference: 'West', division: 'Pacific', city: 'LA', name: 'Clippers', full_name: 'LA Clippers', abbreviation: 'LAC' },
  { id: 14, conference: 'West', division: 'Pacific', city: 'Los Angeles', name: 'Lakers', full_name: 'Los Angeles Lakers', abbreviation: 'LAL' },
  { id: 15, conference: 'West', division: 'Southwest', city: 'Memphis', name: 'Grizzlies', full_name: 'Memphis Grizzlies', abbreviation: 'MEM' },
  { id: 16, conference: 'East', division: 'Southeast', city: 'Miami', name: 'Heat', full_name: 'Miami Heat', abbreviation: 'MIA' },
  { id: 17, conference: 'East', division: 'Central', city: 'Milwaukee', name: 'Bucks', full_name: 'Milwaukee Bucks', abbreviation: 'MIL' },
  { id: 18, conference: 'West', division: 'Northwest', city: 'Minnesota', name: 'Timberwolves', full_name: 'Minnesota Timberwolves', abbreviation: 'MIN' },
  { id: 19, conference: 'West', division: 'Southwest', city: 'New Orleans', name: 'Pelicans', full_name: 'New Orleans Pelicans', abbreviation: 'NOP' },
  { id: 20, conference: 'East', division: 'Atlantic', city: 'New York', name: 'Knicks', full_name: 'New York Knicks', abbreviation: 'NYK' },
  { id: 21, conference: 'West', division: 'Northwest', city: 'Oklahoma City', name: 'Thunder', full_name: 'Oklahoma City Thunder', abbreviation: 'OKC' },
  { id: 22, conference: 'East', division: 'Southeast', city: 'Orlando', name: 'Magic', full_name: 'Orlando Magic', abbreviation: 'ORL' },
  { id: 23, conference: 'East', division: 'Atlantic', city: 'Philadelphia', name: '76ers', full_name: 'Philadelphia 76ers', abbreviation: 'PHI' },
  { id: 24, conference: 'West', division: 'Pacific', city: 'Phoenix', name: 'Suns', full_name: 'Phoenix Suns', abbreviation: 'PHX' },
  { id: 25, conference: 'West', division: 'Northwest', city: 'Portland', name: 'Trail Blazers', full_name: 'Portland Trail Blazers', abbreviation: 'POR' },
  { id: 26, conference: 'West', division: 'Pacific', city: 'Sacramento', name: 'Kings', full_name: 'Sacramento Kings', abbreviation: 'SAC' },
  { id: 27, conference: 'West', division: 'Southwest', city: 'San Antonio', name: 'Spurs', full_name: 'San Antonio Spurs', abbreviation: 'SAS' },
  { id: 28, conference: 'East', division: 'Atlantic', city: 'Toronto', name: 'Raptors', full_name: 'Toronto Raptors', abbreviation: 'TOR' },
  { id: 29, conference: 'West', division: 'Northwest', city: 'Utah', name: 'Jazz', full_name: 'Utah Jazz', abbreviation: 'UTA' },
  { id: 30, conference: 'East', division: 'Southeast', city: 'Washington', name: 'Wizards', full_name: 'Washington Wizards', abbreviation: 'WAS' },
];

function parseArgs(): { offline: boolean } {
  return { offline: process.argv.includes('--offline') };
}

async function balldontlieFetchJson<T>(pathSuffix: string, apiKey: string): Promise<T> {
  const url = `${API_BASE}${pathSuffix}`;
  const res = await fetch(url, {
    headers: { Authorization: apiKey },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`BallDontLie ${pathSuffix} ${res.status}: ${body.slice(0, 200)}`);
  }
  return res.json() as Promise<T>;
}

function normalizeTeam(raw: Record<string, unknown>): NbaSeedTeam | null {
  const id = Number(raw.id);
  if (!Number.isFinite(id)) return null;
  const conf = String(raw.conference ?? '');
  const div = String(raw.division ?? '');
  const city = String(raw.city ?? '');
  const name = String(raw.name ?? '');
  const full = String(raw.full_name ?? '');
  const abbr = String(raw.abbreviation ?? '');
  if (!abbr || !full) return null;
  return {
    id,
    conference: conf,
    division: div,
    city,
    name,
    full_name: full,
    abbreviation: abbr,
  };
}

function normalizePlayer(raw: Record<string, unknown>): NbaSeedPlayer | null {
  const id = Number(raw.id);
  if (!Number.isFinite(id)) return null;
  const first = String(raw.first_name ?? '').trim();
  const last = String(raw.last_name ?? '').trim();
  if (!first || !last) return null;

  const pos = String(raw.position ?? 'Unknown');
  const team = raw.team;
  let team_id: number | null = null;
  if (team && typeof team === 'object' && team !== null && 'id' in team) {
    const tid = Number((team as Record<string, unknown>).id);
    team_id = Number.isFinite(tid) ? tid : null;
  }

  return {
    id,
    first_name: first,
    last_name: last,
    position: pos,
    height: raw.height != null ? String(raw.height) : null,
    weight: raw.weight != null ? String(raw.weight) : null,
    jersey_number: raw.jersey_number != null ? String(raw.jersey_number) : null,
    college: raw.college != null ? String(raw.college) : null,
    country: raw.country != null ? String(raw.country) : null,
    draft_year: raw.draft_year != null ? Number(raw.draft_year) : null,
    draft_round: raw.draft_round != null ? Number(raw.draft_round) : null,
    draft_number: raw.draft_number != null ? Number(raw.draft_number) : null,
    team_id,
  };
}

function validateSeedDoc(doc: NbaSeedDocument): void {
  if (doc.schemaVersion !== NBA_SEED_SCHEMA_VERSION) {
    throw new Error(`Unexpected schemaVersion in memory: ${doc.schemaVersion}`);
  }
  if (!Array.isArray(doc.teams) || !Array.isArray(doc.players)) {
    throw new Error('Seed document must have teams[] and players[] arrays');
  }
}

async function fetchAllTeams(apiKey: string): Promise<NbaSeedTeam[]> {
  const data = await balldontlieFetchJson<{ data: Record<string, unknown>[] }>(
    '/teams',
    apiKey,
  );
  const out: NbaSeedTeam[] = [];
  for (const row of data.data ?? []) {
    const t = normalizeTeam(row);
    if (t) out.push(t);
  }
  out.sort((a, b) => a.id - b.id);
  return out;
}

async function fetchAllPlayers(apiKey: string): Promise<{
  players: NbaSeedPlayer[];
  duplicateIds: number;
  incompleteRows: number;
}> {
  const rows: NbaSeedPlayer[] = [];
  let duplicateIds = 0;
  let incompleteRows = 0;
  const seen = new Set<number>();

  let cursor: number | undefined;

  for (;;) {
    const qs = new URLSearchParams({ per_page: '100' });
    if (cursor !== undefined) qs.set('cursor', String(cursor));
    const path = `/players?${qs.toString()}`;
    const page = await balldontlieFetchJson<{
      data: Record<string, unknown>[];
      meta?: { next_cursor?: number | null };
    }>(path, apiKey);

    for (const raw of page.data ?? []) {
      const p = normalizePlayer(raw);
      if (!p) {
        incompleteRows++;
        continue;
      }
      if (seen.has(p.id)) {
        duplicateIds++;
        continue;
      }
      seen.add(p.id);
      /** Roster-attached players only (excludes unsigned / unavailable rows). */
      if (p.team_id != null) {
        rows.push(p);
      }
    }

    const next = page.meta?.next_cursor;
    if (next === null || next === undefined) break;
    cursor = next;
  }

  rows.sort((a, b) => a.id - b.id);

  if (duplicateIds || incompleteRows) {
    console.warn(
      `[seed] player normalization: dropped duplicates=${duplicateIds} incomplete=${incompleteRows}`,
    );
  }

  return { players: rows, duplicateIds, incompleteRows };
}

export async function buildSeedDocument(opts: {
  offline: boolean;
  apiKey?: string;
}): Promise<{ doc: NbaSeedDocument; meta: NbaSeedMeta; endpointsUsed: string[] }> {
  const endpointsUsed: string[] = [];

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
        apiBaseUrl: API_BASE,
        recordCounts: { teams: doc.teams.length, players: doc.players.length },
        endpointsUsed: [],
        dropStats: { duplicateIds: 0, incompleteRows: 0 },
      },
      endpointsUsed: [],
    };
  }

  const apiKey = opts.apiKey?.trim();
  if (!apiKey) {
    throw new Error(
      'BALLDONTLIE_API_KEY is missing. Set it in the environment or pass --offline for a deterministic teams-only stub.',
    );
  }

  endpointsUsed.push('/teams');
  const teams = await fetchAllTeams(apiKey);
  const { players, duplicateIds, incompleteRows } = await fetchAllPlayers(apiKey);
  endpointsUsed.push('/players (paginated)');

  const doc: NbaSeedDocument = {
    schemaVersion: NBA_SEED_SCHEMA_VERSION,
    teams,
    players,
  };
  validateSeedDoc(doc);

  return {
    doc,
    meta: {
      schemaVersion: NBA_SEED_SCHEMA_VERSION,
      generatedAt: new Date().toISOString(),
      source: 'balldontlie_api',
      apiBaseUrl: API_BASE,
      recordCounts: { teams: teams.length, players: players.length },
      endpointsUsed,
      dropStats: { duplicateIds, incompleteRows },
    },
    endpointsUsed,
  };
}

async function writeArtifacts(rootDir: string, doc: NbaSeedDocument, meta: NbaSeedMeta): Promise<void> {
  const dataDir = path.join(rootDir, 'server', 'data');
  await fs.mkdir(dataDir, { recursive: true });
  await fs.writeFile(path.join(dataDir, 'nba-seed.json'), `${JSON.stringify(doc, null, 2)}\n`, 'utf-8');
  await fs.writeFile(path.join(dataDir, 'nba-seed.meta.json'), `${JSON.stringify(meta, null, 2)}\n`, 'utf-8');
}

async function main(): Promise<void> {
  const { offline } = parseArgs();
  const rootDir = path.resolve(__dirname, '..', '..');
  const apiKey = process.env.BALLDONTLIE_API_KEY;

  console.log(`[seed:nba] mode=${offline ? 'offline_static' : 'api'} schema=${NBA_SEED_SCHEMA_VERSION}`);
  const { doc, meta } = await buildSeedDocument({ offline, apiKey });
  await writeArtifacts(rootDir, doc, meta);
  console.log(
    `[seed:nba] wrote server/data/nba-seed.json teams=${doc.teams.length} players=${doc.players.length}`,
  );
  console.log(`[seed:nba] meta source=${meta.source} at ${meta.generatedAt}`);
}

function isDirectSeedInvocation(): boolean {
  return process.argv.some((arg) => /seedBallDontLie\.(ts|js|cjs|mjs)$/.test(arg));
}

if (isDirectSeedInvocation()) {
  void main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
