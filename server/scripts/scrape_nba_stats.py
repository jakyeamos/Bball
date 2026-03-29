#!/usr/bin/env python3
"""
Batch NBA stats artifact builder.

Builds a versioned current-season artifact by merging:
- league dash totals
- optional tracking splits
- optional hustle data
- optional offline public priors
"""

import argparse
import csv
import datetime
import json
import math
import os
import sys
from typing import Any, Dict, List, Optional

try:
    from nba_api.stats.endpoints import (
        leaguedashplayerstats,
        leaguehustlestatsplayer,
        leaguedashptstats,
    )
    from nba_api.stats.static import players as static_players
except ImportError:
    print("Error: nba_api not installed. Install with: pip install nba-api", file=sys.stderr)
    sys.exit(1)

ARTIFACT_SCHEMA_VERSION = 2
IDENTITY_SEED_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "nba-seed.json")
_POSITION_LOOKUP: Optional[Dict[int, str]] = None


def _f(row: Any, col: str) -> Optional[float]:
    if row is None:
        return None
    if hasattr(row, "index"):
        if col not in row.index:
            return None
        value = row[col]
    elif isinstance(row, dict):
        if col not in row:
            return None
        value = row[col]
    else:
        return None
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def utc_timestamp() -> str:
    return datetime.datetime.now(datetime.timezone.utc).isoformat().replace("+00:00", "Z")


def empty_artifact(season: str) -> Dict[str, Any]:
    return {
        "schemaVersion": ARTIFACT_SCHEMA_VERSION,
        "season": season,
        "generatedAt": utc_timestamp(),
        "source": "batch_v2",
        "players": [],
    }


def _coerce_prior_value(value: Any) -> Any:
    if value in ("", None):
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return value


def _sanitize_json_value(value: Any) -> Any:
    if isinstance(value, float):
        return value if math.isfinite(value) else None
    if isinstance(value, dict):
        return {key: _sanitize_json_value(inner) for key, inner in value.items()}
    if isinstance(value, list):
        return [_sanitize_json_value(inner) for inner in value]
    return value


def normalize_position(raw: Optional[str]) -> str:
    if not raw:
        return ""
    value = str(raw).upper().strip()
    if value in ("PG", "POINT GUARD"):
        return "PG"
    if value in ("SG", "SHOOTING GUARD"):
        return "SG"
    if value in ("SF", "SMALL FORWARD"):
        return "SF"
    if value in ("PF", "POWER FORWARD"):
        return "PF"
    if value in ("C", "CENTER"):
        return "C"
    if value in ("G", "G-F", "F-G"):
        return "SG"
    if value in ("F", "F-C", "C-F"):
        return "SF"
    if "CENTER" in value:
        return "C"
    if "FORWARD" in value:
        return "SF"
    if "GUARD" in value:
        return "SG"
    return value


def load_position_lookup() -> Dict[int, str]:
    global _POSITION_LOOKUP  # noqa: PLW0603
    if _POSITION_LOOKUP is not None:
        return _POSITION_LOOKUP

    lookup: Dict[int, str] = {}
    if os.path.exists(IDENTITY_SEED_PATH):
        try:
            with open(IDENTITY_SEED_PATH, "r", encoding="utf-8") as handle:
                payload = json.load(handle)
            for player in payload.get("players", []):
                player_id = player.get("id")
                position = normalize_position(player.get("position"))
                if player_id is None or not position:
                    continue
                lookup[int(player_id)] = position
        except Exception as exc:  # noqa: BLE001
            print(f"[scrape_nba_stats] failed to read identity seed positions: {exc}", file=sys.stderr)

    _POSITION_LOOKUP = lookup
    return lookup


def _df_by_player_id(df: Any) -> Dict[str, Any]:
    result: Dict[str, Any] = {}
    for _, row in df.iterrows():
        player_id = row.get("PLAYER_ID")
        if player_id is None:
            continue
        result[str(int(player_id))] = row
    return result


def get_position(player_id: int) -> str:
    seed_position = load_position_lookup().get(player_id)
    if seed_position:
        return seed_position

    players = static_players.get_players()
    for player in players:
        if player.get("id") == player_id:
            normalized = normalize_position(player.get("position"))
            if normalized:
                return normalized
            break
    return "SF"


def fetch_tracking_measure(season: str, measure_type: str) -> Dict[str, Any]:
    try:
        endpoint = leaguedashptstats.LeagueDashPtStats(
            season=season,
            season_type_all_star="Regular Season",
            player_or_team="Player",
            pt_measure_type=measure_type,
            per_mode_simple="Totals",
        )
        return _df_by_player_id(endpoint.get_data_frames()[0])
    except Exception as exc:  # noqa: BLE001
        print(f"[scrape_nba_stats] tracking measure {measure_type} unavailable: {exc}", file=sys.stderr)
        return {}


def fetch_hustle(season: str) -> Dict[str, Any]:
    try:
        endpoint = leaguehustlestatsplayer.LeagueHustleStatsPlayer(
            season=season,
            season_type_all_star="Regular Season",
            per_mode_time="Totals",
        )
        return _df_by_player_id(endpoint.get_data_frames()[0])
    except Exception as exc:  # noqa: BLE001
        print(f"[scrape_nba_stats] hustle data unavailable: {exc}", file=sys.stderr)
        return {}


def load_public_priors(priors_path: Optional[str]) -> Dict[str, Dict[str, Any]]:
    if not priors_path:
        return {}
    if not os.path.exists(priors_path):
        print(f"[scrape_nba_stats] priors file not found: {priors_path}", file=sys.stderr)
        return {}

    if priors_path.lower().endswith(".csv"):
        result: Dict[str, Dict[str, Any]] = {}
        with open(priors_path, "r", encoding="utf-8", newline="") as handle:
            reader = csv.DictReader(handle)
            for payload in reader:
                player_id = (
                    payload.get("playerId")
                    or payload.get("player_id")
                    or payload.get("PLAYER_ID")
                )
                if player_id is None:
                    continue
                result[str(player_id)] = {
                    key: _coerce_prior_value(value)
                    for key, value in payload.items()
                }
        return result

    with open(priors_path, "r", encoding="utf-8") as handle:
        raw = json.load(handle)

    if isinstance(raw, dict):
        return {str(player_id): payload for player_id, payload in raw.items()}

    if isinstance(raw, list):
        result: Dict[str, Dict[str, Any]] = {}
        for payload in raw:
            if not isinstance(payload, dict):
                continue
            player_id = payload.get("playerId") or payload.get("player_id")
            if player_id is None:
                continue
            result[str(player_id)] = payload
        return result

    return {}


def fetch_player_stats(season: str = "2025-26", priors_path: Optional[str] = None) -> Dict[str, Any]:
    try:
        stats = leaguedashplayerstats.LeagueDashPlayerStats(
            season=season,
            season_type_all_star="Regular Season",
            per_mode_detailed="Totals",
        )

        base_df = stats.get_data_frames()[0]
        hustle_by_id = fetch_hustle(season)
        passing_by_id = fetch_tracking_measure(season, "Passing")
        drives_by_id = fetch_tracking_measure(season, "Drives")
        rebounding_by_id = fetch_tracking_measure(season, "Rebounding")
        catch_shoot_by_id = fetch_tracking_measure(season, "CatchShoot")
        pull_up_by_id = fetch_tracking_measure(season, "PullUpShot")
        possessions_by_id = fetch_tracking_measure(season, "Possessions")
        efficiency_by_id = fetch_tracking_measure(season, "Efficiency")
        priors_by_id = load_public_priors(priors_path)

        player_rows: List[Dict[str, Any]] = []

        for _, row in base_df.iterrows():
            player_id = str(int(row["PLAYER_ID"]))
            passing = passing_by_id.get(player_id)
            drives = drives_by_id.get(player_id)
            rebounding = rebounding_by_id.get(player_id)
            catch_shoot = catch_shoot_by_id.get(player_id)
            pull_up = pull_up_by_id.get(player_id)
            possessions = possessions_by_id.get(player_id)
            efficiency = efficiency_by_id.get(player_id)
            hustle = hustle_by_id.get(player_id)
            priors = priors_by_id.get(player_id)

            fga = float(row["FGA"])
            fgm = float(row["FGM"])
            fg3a = float(row["FG3A"])
            fg3m = float(row["FG3M"])
            fta = float(row["FTA"])
            ftm = float(row["FTM"])
            gp = int(row["GP"])
            min_val = float(row["MIN"])
            oreb = float(row["OREB"])
            dreb = float(row["DREB"])
            tov = float(row["TOV"])

            two_pa = fga - fg3a
            two_pm = fgm - fg3m
            two_pct = (two_pm / two_pa) if two_pa > 0 else 0.0
            three_pct = (fg3m / fg3a) if fg3a > 0 else 0.0
            ft_pct = (ftm / fta) if fta > 0 else 0.0
            ts_denom = fga + 0.44 * fta
            ts_pct = (float(row["PTS"]) / (2 * ts_denom)) if ts_denom > 0 else 0.0
            poss_est = max(1.0, 0.96 * (fga + 0.44 * fta + tov - oreb))

            player_rows.append({
                "playerId": player_id,
                "name": row["PLAYER_NAME"],
                "team": row["TEAM_ABBREVIATION"],
                "position": get_position(int(row["PLAYER_ID"])),
                "AGE": _f(row, "AGE"),
                "GP": gp,
                "MIN": min_val,
                "PTS": float(row["PTS"]),
                "REB": float(row["REB"]),
                "AST": float(row["AST"]),
                "STL": float(row["STL"]),
                "BLK": float(row["BLK"]),
                "FGA": fga,
                "FGM": fgm,
                "FTA": fta,
                "FTM": ftm,
                "THREE_PA": fg3a,
                "THREE_PM": fg3m,
                "TOV": tov,
                "ORB": oreb,
                "DRB": dreb,
                "PF": float(row["PF"]),
                "TWO_PA": two_pa,
                "TWO_PM": two_pm,
                "TWO_P_PCT": two_pct,
                "THREE_P_PCT": three_pct,
                "FT_PCT": ft_pct,
                "TS_PCT": ts_pct,
                "POSS_EST": poss_est,
                "USG_PCT": _f(row, "USG_PCT"),
                "OREB_PCT": _f(row, "OREB_PCT"),
                "DREB_PCT": _f(row, "DREB_PCT"),
                "REB_PCT": _f(row, "REB_PCT"),
                "AST_PCT": _f(row, "AST_PCT"),
                "TOV_PCT": _f(row, "TOV_PCT"),
                "POTENTIAL_AST": _f(passing, "POTENTIAL_AST"),
                "SECONDARY_AST": _f(passing, "SECONDARY_AST"),
                "PASSES_MADE": _f(passing, "PASSES_MADE"),
                "PASSES_RECEIVED": _f(passing, "PASSES_RECEIVED"),
                "TOUCHES": _f(passing, "TOUCHES"),
                "FRONTCOURT_TOUCHES": _f(passing, "FRONT_CT_TOUCHES") or _f(passing, "FRONTCOURT_TOUCHES"),
                "TIME_OF_POSSESSION": _f(passing, "TIME_OF_POSSESSION"),
                "AVG_SEC_PER_TOUCH": _f(passing, "AVG_SEC_PER_TOUCH"),
                "AVG_DRIBBLES_PER_TOUCH": _f(passing, "AVG_DRIB_PER_TOUCH") or _f(passing, "AVG_DRIBBLES_PER_TOUCH"),
                "DRIVE_FGA": _f(drives, "DRIVES_FGA") or _f(drives, "FGA"),
                "DRIVE_FGM": _f(drives, "DRIVES_FGM") or _f(drives, "FGM"),
                "DRIVE_FTA": _f(drives, "DRIVES_FTA") or _f(drives, "FTA"),
                "DRIVE_PASSES": _f(drives, "PASSES") or _f(drives, "DRIVE_PASSES"),
                "PAINT_TOUCHES": _f(drives, "PAINT_TOUCHES"),
                "ELBOW_TOUCHES": _f(passing, "ELBOW_TOUCHES"),
                "POST_TOUCHES": _f(passing, "POST_TOUCHES"),
                "DEFLECTIONS": _f(hustle, "DEFLECTIONS"),
                "CHARGES_DRAWN": _f(hustle, "CHARGES_DRAWN"),
                "CONTESTED_SHOTS": _f(hustle, "CONTESTED_SHOTS"),
                "LOOSE_BALLS_RECOVERED": _f(hustle, "LOOSE_BALLS_RECOVERED"),
                "BOX_OUTS": _f(hustle, "BOX_OUTS"),
                "CONTESTED_REB": _f(rebounding, "CONTESTED_REB"),
                "SCREEN_ASSISTS": _f(passing, "SCREEN_ASSISTS"),
                "CATCH_SHOOT_3PA": _f(catch_shoot, "CATCH_SHOOT_FG3A") or _f(catch_shoot, "FG3A"),
                "CATCH_SHOOT_3PM": _f(catch_shoot, "CATCH_SHOOT_FG3M") or _f(catch_shoot, "FG3M"),
                "CATCH_SHOOT_3_PCT": _f(catch_shoot, "CATCH_SHOOT_FG3_PCT") or _f(catch_shoot, "FG3_PCT"),
                "PULL_UP_3PA": _f(pull_up, "PULL_UP_FG3A") or _f(pull_up, "FG3A"),
                "PULL_UP_3PM": _f(pull_up, "PULL_UP_FG3M") or _f(pull_up, "FG3M"),
                "PULL_UP_3_PCT": _f(pull_up, "PULL_UP_FG3_PCT") or _f(pull_up, "FG3_PCT"),
                "TRANSITION_FREQ": _f(possessions, "TRANSITION_POSS_PCT") or _f(possessions, "TRANSITION_FREQ"),
                "TRANSITION_PPP": _f(efficiency, "TRANSITION_PPP") or _f(efficiency, "PPP"),
                "ISOLATION_FREQ": _f(possessions, "ISOLATION_POSS_PCT") or _f(possessions, "ISOLATION_FREQ"),
                "ISOLATION_PPP": _f(efficiency, "ISOLATION_PPP"),
                "PNR_BALL_HANDLER_FREQ": _f(possessions, "PR_BALL_HANDLER_POSS_PCT") or _f(possessions, "PNR_BALL_HANDLER_FREQ"),
                "PNR_BALL_HANDLER_PPP": _f(efficiency, "PR_BALL_HANDLER_PPP") or _f(efficiency, "PNR_BALL_HANDLER_PPP"),
                "PNR_ROLL_MAN_FREQ": _f(possessions, "PR_ROLL_MAN_POSS_PCT") or _f(possessions, "PNR_ROLL_MAN_FREQ"),
                "PNR_ROLL_MAN_PPP": _f(efficiency, "PR_ROLL_MAN_PPP") or _f(efficiency, "PNR_ROLL_MAN_PPP"),
                "SPOT_UP_FREQ": _f(possessions, "SPOT_UP_POSS_PCT") or _f(possessions, "SPOT_UP_FREQ"),
                "SPOT_UP_PPP": _f(efficiency, "SPOT_UP_PPP"),
                "HANDOFF_FREQ": _f(possessions, "HANDOFF_POSS_PCT") or _f(possessions, "HANDOFF_FREQ"),
                "HANDOFF_PPP": _f(efficiency, "HANDOFF_PPP"),
                "CUT_FREQ": _f(possessions, "CUT_POSS_PCT") or _f(possessions, "CUT_FREQ"),
                "CUT_PPP": _f(efficiency, "CUT_PPP"),
                "PUBLIC_PRIORS": priors,
            })

        return {
            "schemaVersion": ARTIFACT_SCHEMA_VERSION,
            "season": season,
            "generatedAt": utc_timestamp(),
            "source": "batch_v2",
            "players": player_rows,
        }

    except Exception as exc:  # noqa: BLE001
        print(f"Error fetching stats: {exc}", file=sys.stderr)
        return empty_artifact(season)


def main() -> None:
    parser = argparse.ArgumentParser(description="Build an enriched NBA season stats artifact")
    parser.add_argument("--season", default="2025-26", help="Season in format YYYY-YY")
    parser.add_argument("--output", help="Output file (default: stdout)")
    parser.add_argument("--priors", help="Optional path to offline public priors JSON/CSV export", default=None)
    args = parser.parse_args()

    artifact = _sanitize_json_value(fetch_player_stats(args.season, args.priors))
    output = json.dumps(artifact, indent=2, allow_nan=False)

    if args.output:
        output_dir = os.path.dirname(args.output)
        if output_dir:
            os.makedirs(output_dir, exist_ok=True)
        with open(args.output, "w", encoding="utf-8") as handle:
            handle.write(output)
        print(
            f"Wrote {len(artifact['players'])} players to {args.output}",
            file=sys.stderr,
        )
    else:
        print(output)


if __name__ == "__main__":
    main()
