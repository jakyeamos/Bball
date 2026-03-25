#!/usr/bin/env python3
"""
Build-time NBA identity seed via nba_api (stats.nba.com).
Outputs a JSON document to stdout for seedNbaIdentity.ts to write nba-seed.json.

Usage:
  python3 server/scripts/seed_nba_identity.py --season 2025-26
"""

from __future__ import annotations

import argparse
import json
import math
import sys
import time
from typing import Any, Dict, List, Optional, Tuple

try:
    from nba_api.stats.endpoints import commonteamroster, leaguedashplayerstats
    from nba_api.stats.static import teams as static_teams
except ImportError:
    print(
        "Error: nba_api not installed. Install with:\n"
        "  python3 -m pip install -r server/scripts/requirements-nba.txt",
        file=sys.stderr,
    )
    sys.exit(1)

# Conference / division by abbreviation (matches prior curated seed).
CONF_DIV_BY_ABBR: Dict[str, Tuple[str, str]] = {
    "ATL": ("East", "Southeast"),
    "BOS": ("East", "Atlantic"),
    "BKN": ("East", "Atlantic"),
    "CHA": ("East", "Southeast"),
    "CHI": ("East", "Central"),
    "CLE": ("East", "Central"),
    "DAL": ("West", "Southwest"),
    "DEN": ("West", "Northwest"),
    "DET": ("East", "Central"),
    "GSW": ("West", "Pacific"),
    "HOU": ("West", "Southwest"),
    "IND": ("East", "Central"),
    "LAC": ("West", "Pacific"),
    "LAL": ("West", "Pacific"),
    "MEM": ("West", "Southwest"),
    "MIA": ("East", "Southeast"),
    "MIL": ("East", "Central"),
    "MIN": ("West", "Northwest"),
    "NOP": ("West", "Southwest"),
    "NYK": ("East", "Atlantic"),
    "OKC": ("West", "Northwest"),
    "ORL": ("East", "Southeast"),
    "PHI": ("East", "Atlantic"),
    "PHX": ("West", "Pacific"),
    "POR": ("West", "Northwest"),
    "SAC": ("West", "Pacific"),
    "SAS": ("West", "Southwest"),
    "TOR": ("East", "Atlantic"),
    "UTA": ("West", "Northwest"),
    "WAS": ("East", "Southeast"),
}

ROSTER_DELAY_SEC = 0.65


def _split_player_name(player: str) -> Tuple[str, str]:
    p = (player or "").strip()
    if not p:
        return ("Unknown", "")
    parts = p.split()
    if len(parts) == 1:
        return (parts[0], "")
    return (parts[0], " ".join(parts[1:]))


def _num_to_jersey(v: Any) -> Optional[str]:
    if v is None:
        return None
    if isinstance(v, float) and (math.isnan(v) or math.isinf(v)):
        return None
    s = str(v).strip()
    if not s or s.lower() == "nan":
        return None
    try:
        n = int(float(v))
        return str(n)
    except (TypeError, ValueError):
        return s


def _str_or_none(v: Any) -> Optional[str]:
    if v is None:
        return None
    if isinstance(v, float) and (math.isnan(v) or math.isinf(v)):
        return None
    s = str(v).strip()
    return s if s else None


def _build_teams(team_ids: List[int]) -> Tuple[List[Dict[str, Any]], int]:
    """Return team dicts and count of teams missing static metadata."""
    by_id = {t["id"]: t for t in static_teams.get_teams()}
    teams: List[Dict[str, Any]] = []
    missing = 0
    for tid in sorted(team_ids):
        st = by_id.get(tid)
        if not st:
            missing += 1
            continue
        abbr = st["abbreviation"]
        conf_div = CONF_DIV_BY_ABBR.get(abbr)
        if not conf_div:
            missing += 1
            continue
        conf, div = conf_div
        teams.append(
            {
                "id": tid,
                "conference": conf,
                "division": div,
                "city": st.get("city") or "",
                "name": st.get("nickname") or "",
                "full_name": st.get("full_name") or "",
                "abbreviation": abbr,
            }
        )
    teams.sort(key=lambda t: t["id"])
    return teams, missing


def _roster_row_to_player(row: Any) -> Optional[Dict[str, Any]]:
    try:
        pid = int(row["PLAYER_ID"])
    except (TypeError, ValueError, KeyError):
        return None
    if pid <= 0:
        return None
    first, last = _split_player_name(str(row.get("PLAYER") or ""))
    if not first:
        return None
    pos = _str_or_none(row.get("POSITION")) or "Unknown"
    team_id_raw = row.get("TeamID")
    try:
        team_id = int(team_id_raw) if team_id_raw is not None else None
    except (TypeError, ValueError):
        team_id = None

    h = _str_or_none(row.get("HEIGHT"))
    w = _str_or_none(row.get("WEIGHT"))
    school = _str_or_none(row.get("SCHOOL"))

    return {
        "id": pid,
        "first_name": first,
        "last_name": last,
        "position": pos,
        "height": h,
        "weight": w,
        "jersey_number": _num_to_jersey(row.get("NUM")),
        "college": school,
        "country": None,
        "draft_year": None,
        "draft_round": None,
        "draft_number": None,
        "team_id": team_id,
    }


def fetch_identity(season: str) -> Dict[str, Any]:
    ld = leaguedashplayerstats.LeagueDashPlayerStats(
        season=season,
        season_type_all_star="Regular Season",
        per_mode_detailed="Totals",
    )
    df = ld.get_data_frames()[0]
    team_ids = sorted({int(x) for x in df["TEAM_ID"].unique()})

    teams, teams_missing = _build_teams(team_ids)
    team_id_set = {t["id"] for t in teams}
    roster_incomplete = teams_missing

    # PLAYER_ID -> latest roster row (last team wins — stable iteration order).
    player_rows: Dict[int, Dict[str, Any]] = {}
    duplicate_ids = 0
    roster_calls = 0

    for tid in team_ids:
        if tid not in team_id_set:
            continue
        if roster_calls > 0:
            time.sleep(ROSTER_DELAY_SEC)
        roster_calls += 1
        try:
            r = commonteamroster.CommonTeamRoster(team_id=tid, season=season)
            roster_df = r.get_data_frames()[0]
        except Exception as e:
            print(f"[seed_nba_identity] roster failed team_id={tid}: {e}", file=sys.stderr)
            roster_incomplete += 1
            continue

        for _, row in roster_df.iterrows():
            p = _roster_row_to_player(row)
            if not p:
                roster_incomplete += 1
                continue
            if p["id"] in player_rows:
                duplicate_ids += 1
            player_rows[p["id"]] = p

    players = sorted(player_rows.values(), key=lambda x: x["id"])

    endpoints_used: List[str] = [
        "leaguedashplayerstats (distinct TEAM_ID)",
        f"commonteamroster ({roster_calls} teams)",
    ]

    return {
        "teams": teams,
        "players": players,
        "endpointsUsed": endpoints_used,
        "dropStats": {
            "duplicateIds": duplicate_ids,
            "incompleteRows": roster_incomplete,
        },
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="NBA identity seed (nba_api) → JSON stdout")
    parser.add_argument("--season", default="2025-26", help="Season e.g. 2025-26")
    args = parser.parse_args()

    payload = fetch_identity(args.season)
    print(json.dumps(payload, indent=2))


if __name__ == "__main__":
    main()
