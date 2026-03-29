import { parseArgs } from 'node:util';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { NbaScraperSeasonStatsRow, PlayerRawStats } from '@nba-draft-sim/shared';
import { nbaSeasonJsonRowToPlayerRawStats } from '../services/playerFeaturesMapping';
import {
  generateCalibrationReport,
  renderCalibrationReport,
} from '../services/calibrationHarness';

interface PlayerStatsArtifact {
  schemaVersion: number;
  season: string;
  generatedAt: string;
  source: 'batch_v2';
  players: NbaScraperSeasonStatsRow[];
}

const ARTIFACT_SCHEMA_VERSION = 2;

function serverPackageRoot(): string {
  return path.basename(process.cwd()) === 'server'
    ? process.cwd()
    : path.join(process.cwd(), 'server');
}

function defaultArtifactPath(season: string): string {
  return path.join(serverPackageRoot(), 'data', `player-stats-${season}.json`);
}

function parseNumber(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parsePlayers(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function resolveOutputPath(output: string): string {
  if (path.isAbsolute(output)) return output;

  const cwdBase = path.basename(process.cwd());
  if (cwdBase === 'server' && /^server[\\/]/.test(output)) {
    return path.resolve(output.replace(/^server[\\/]/, ''));
  }
  if (cwdBase !== 'server' && /^data[\\/]/.test(output)) {
    return path.join(serverPackageRoot(), output);
  }
  return path.resolve(output);
}

function isArtifact(raw: unknown, season: string): raw is PlayerStatsArtifact {
  if (typeof raw !== 'object' || raw === null) return false;
  const artifact = raw as Partial<PlayerStatsArtifact>;
  return (
    artifact.schemaVersion === ARTIFACT_SCHEMA_VERSION
    && artifact.season === season
    && artifact.source === 'batch_v2'
    && Array.isArray(artifact.players)
  );
}

async function readArtifact(file: string, season: string): Promise<PlayerStatsArtifact> {
  const rawText = await fs.readFile(file, 'utf-8');
  const sanitizedText = rawText
    .replace(/\bNaN\b/g, 'null')
    .replace(/\b-Infinity\b/g, 'null')
    .replace(/\bInfinity\b/g, 'null');
  const raw = JSON.parse(sanitizedText) as unknown;
  if (!isArtifact(raw, season)) {
    throw new Error(`Artifact ${file} is missing, stale, or has an unexpected schema version.`);
  }
  return raw;
}

function filterPlayers(players: PlayerRawStats[], minGames: number, minMinutes: number): PlayerRawStats[] {
  return players.filter((player) => player.GP >= minGames && player.MP_TOTAL >= minMinutes);
}

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      season: { type: 'string', default: '2025-26' },
      artifact: { type: 'string' },
      'min-games': { type: 'string', default: '10' },
      'min-minutes': { type: 'string', default: '250' },
      top: { type: 'string', default: '8' },
      sims: { type: 'string', default: '300' },
      'team-size': { type: 'string', default: '10' },
      players: { type: 'string' },
      output: { type: 'string' },
      json: { type: 'boolean', default: false },
    },
    allowPositionals: false,
  });

  const season = values.season;
  const artifactFile = path.resolve(values.artifact ?? defaultArtifactPath(season));
  const minGames = parseNumber(values['min-games'], 10);
  const minMinutes = parseNumber(values['min-minutes'], 250);
  const topPlayers = parseNumber(values.top, 8);
  const sims = parseNumber(values.sims, 300);
  const teamSize = parseNumber(values['team-size'], 10);
  const focusPlayers = parsePlayers(values.players);

  const artifact = await readArtifact(artifactFile, season);
  const rawPlayers = artifact.players.map((row) => nbaSeasonJsonRowToPlayerRawStats(row));
  const filteredPlayers = filterPlayers(rawPlayers, minGames, minMinutes);

  const report = await generateCalibrationReport(filteredPlayers, {
    season,
    topPlayers,
    sims,
    teamSize,
    focusPlayers,
  });

  const reportPayload = {
    artifact: {
      path: artifactFile,
      schemaVersion: artifact.schemaVersion,
      generatedAt: artifact.generatedAt,
      playerCount: artifact.players.length,
      filteredPlayerCount: filteredPlayers.length,
      minGames,
      minMinutes,
    },
    report,
  };

  if (values.output) {
    const outputFile = resolveOutputPath(values.output);
    await fs.mkdir(path.dirname(outputFile), { recursive: true });
    await fs.writeFile(outputFile, JSON.stringify(reportPayload, null, 2), 'utf-8');
    console.error(`Wrote calibration report to ${outputFile}`);
  }

  if (values.json) {
    process.stdout.write(`${JSON.stringify(reportPayload, null, 2)}\n`);
    return;
  }

  process.stdout.write(
    [
      `Artifact: ${artifactFile}`,
      `Artifact generated: ${artifact.generatedAt}`,
      `Artifact players: ${artifact.players.length}`,
      `Filtered players: ${filteredPlayers.length} (minGames ${minGames}, minMinutes ${minMinutes})`,
      '',
      renderCalibrationReport(report),
      '',
    ].join('\n'),
  );
}

main().catch((error) => {
  console.error('[calibrateDraftSim] failed:', error);
  process.exitCode = 1;
});
