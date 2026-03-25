/**
 * Disk-backed NBA identity cache (nba-seed.json + coach profiles).
 * No live HTTP to stats.nba.com — loads JSON committed under server/data/.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import type {
  NbaSeedDocument,
  NbaSeedPlayer,
  NbaSeedTeam,
} from '../scripts/seedNbaIdentity';

export type PacePreference = 'fast' | 'medium' | 'slow';

export interface CoachProfile {
  teamAbbreviation: string;
  headCoachName: string;
  pace: PacePreference;
  scheme: string;
  youthDevelopment: boolean;
  driverFriendly: boolean;
  shooterFriendly: boolean;
}

export interface CoachesSeedFile {
  schemaVersion: number;
  coaches: CoachProfile[];
}

function serverDataDir(): string {
  return path.join(__dirname, '..', '..', '..', 'data');
}

async function readJson<T>(file: string): Promise<T> {
  const full = path.join(serverDataDir(), file);
  const raw = await fs.readFile(full, 'utf-8');
  return JSON.parse(raw) as T;
}

export class NbaDataCache {
  private seed: NbaSeedDocument | null = null;

  private coachesByAbbrev = new Map<string, CoachProfile>();

  private loadPromise: Promise<void> | null = null;

  /** Background warm-up: parse seed + coaches from disk. */
  warmUp(): Promise<void> {
    if (!this.loadPromise) {
      this.loadPromise = this.loadFromDisk();
    }
    return this.loadPromise;
  }

  private async loadFromDisk(): Promise<void> {
    const t0 = Date.now();
    const [seed, coachFile] = await Promise.all([
      readJson<NbaSeedDocument>('nba-seed.json'),
      readJson<CoachesSeedFile>('coaches-seed.json'),
    ]);

    if (!seed.teams?.length) {
      console.warn('[dataCache] nba-seed.json has no teams — check seed step');
    }
    this.seed = seed;

    this.coachesByAbbrev.clear();
    for (const c of coachFile.coaches ?? []) {
      this.coachesByAbbrev.set(c.teamAbbreviation.toUpperCase(), c);
    }

    const ms = Date.now() - t0;
    console.log(
      `[dataCache] warm-up complete teams=${seed.teams.length} players=${seed.players.length} coaches=${this.coachesByAbbrev.size} (${ms}ms)`,
    );
  }

  getTeams(): NbaSeedTeam[] {
    return this.seed?.teams.slice() ?? [];
  }

  getPlayers(): NbaSeedPlayer[] {
    return this.seed?.players.slice() ?? [];
  }

  getTeamById(id: number): NbaSeedTeam | undefined {
    return this.seed?.teams.find((t) => t.id === id);
  }

  getPlayerById(id: number): NbaSeedPlayer | undefined {
    return this.seed?.players.find((p) => p.id === id);
  }

  getCoachByTeamAbbreviation(abbr: string): CoachProfile | undefined {
    return this.coachesByAbbrev.get(abbr.toUpperCase());
  }
}

let singleton: NbaDataCache | null = null;

export function getNbaDataCache(): NbaDataCache {
  if (!singleton) singleton = new NbaDataCache();
  return singleton;
}
