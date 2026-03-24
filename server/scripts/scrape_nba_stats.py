#!/usr/bin/env python3
"""
NBA Stats Scraper using nba_api
Fetches player stats for a given season and outputs JSON for PlayerFeatures mapping.
"""

import json
import sys
import argparse
from typing import List, Dict, Any, Optional

try:
    from nba_api.stats.endpoints import leaguedashplayerstats
    from nba_api.stats.static import players as static_players
except ImportError:
    print("Error: nba_api not installed. Install with: pip install nba-api", file=sys.stderr)
    sys.exit(1)


def _f(row: Any, col: str) -> Optional[float]:
    if col not in row.index:
        return None
    v = row[col]
    if v is None:
        return None
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def get_position(player_id: int) -> str:
    """Map static roster position to composite labels used by POSITION_TO_ROLE (PG/SG/SF/PF/C)."""
    players = static_players.get_players()
    raw = ""
    for pl in players:
        if pl.get("id") == player_id:
            raw = str(pl.get("position") or "")
            break
    u = raw.upper()
    if "CENTER" in u or u == "C":
        return "C"
    if "FORWARD" in u or "F-" in u or "-F" in u or u == "F":
        if "POWER" in u or "PF" in u:
            return "PF"
        return "SF"
    if "GUARD" in u or "G-" in u or "-G" in u or u == "G":
        if "POINT" in u or "PG" in u:
            return "PG"
        return "SG"
    return "PG"


def fetch_player_stats(season: str = "2025-26") -> List[Dict[str, Any]]:
    try:
        stats = leaguedashplayerstats.LeagueDashPlayerStats(
            season=season,
            season_type_all_star="Regular Season",
            per_mode_detailed="Totals",
        )

        df = stats.get_data_frames()[0]

        player_data: List[Dict[str, Any]] = []

        for _, row in df.iterrows():
            pid = int(row["PLAYER_ID"])
            fga = float(row["FGA"])
            fgm = float(row["FGM"])
            fg3a = float(row["FG3A"])
            fg3m = float(row["FG3M"])
            fta = float(row["FTA"])
            ftm = float(row["FTM"])
            min_val = float(row["MIN"])
            gp = int(row["GP"])

            two_pa = fga - fg3a
            two_pm = fgm - fg3m
            two_pct = (two_pm / two_pa) if two_pa > 0 else 0.0
            three_pct = (fg3m / fg3a) if fg3a > 0 else 0.0
            ft_pct = (ftm / fta) if fta > 0 else 0.0
            ts_denom = fga + 0.44 * fta
            ts_pct = (float(row["PTS"]) / (2 * ts_denom)) if ts_denom > 0 else 0.0

            oreb = float(row["OREB"])
            dreb = float(row["DREB"])
            reb = float(row["REB"])
            ast = float(row["AST"])
            tov = float(row["TOV"])
            poss_est = max(1.0, 0.96 * (fga + 0.44 * fta + tov - oreb))

            player: Dict[str, Any] = {
                "playerId": str(pid),
                "name": row["PLAYER_NAME"],
                "team": row["TEAM_ABBREVIATION"],
                "position": get_position(pid),
                "GP": gp,
                "MIN": min_val,
                "PTS": float(row["PTS"]),
                "REB": reb,
                "AST": ast,
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
            }
            player_data.append(player)

        return player_data

    except Exception as e:
        print(f"Error fetching stats: {e}", file=sys.stderr)
        return []


def main():
    parser = argparse.ArgumentParser(description="Scrape NBA player stats")
    parser.add_argument("--season", default="2025-26", help="Season in format YYYY-YY")
    parser.add_argument("--output", help="Output file (default: stdout)")

    args = parser.parse_args()

    player_stats = fetch_player_stats(args.season)

    output = json.dumps(player_stats, indent=2)

    if args.output:
        with open(args.output, 'w', encoding="utf-8") as f:
            f.write(output)
        print(f"Wrote {len(player_stats)} players to {args.output}", file=sys.stderr)
    else:
        print(output)


if __name__ == "__main__":
    main()
