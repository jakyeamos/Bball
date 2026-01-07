#!/usr/bin/env python3
"""
NBA Stats Scraper using nba_api
Fetches player stats for a given season and outputs JSON
"""

import json
import sys
import argparse
from typing import List, Dict, Any

try:
    from nba_api.stats.endpoints import leaguedashplayerstats, commonplayerinfo
    from nba_api.stats.static import players as nba_players
except ImportError:
    print("Error: nba_api not installed. Install with: pip install nba-api", file=sys.stderr)
    sys.exit(1)


def fetch_player_stats(season: str = "2025-26") -> List[Dict[str, Any]]:
    """
    Fetch player stats for a given season

    Args:
        season: Season in format "2025-26"

    Returns:
        List of player stat dictionaries
    """
    try:
        # Fetch player stats using nba_api
        stats = leaguedashplayerstats.LeagueDashPlayerStats(
            season=season,
            season_type_all_star="Regular Season",
            per_mode_detailed="Totals"
        )

        df = stats.get_data_frames()[0]

        # Map column names to our format
        player_data = []

        for _, row in df.iterrows():
            player = {
                "playerId": str(row["PLAYER_ID"]),
                "name": row["PLAYER_NAME"],
                "team": row["TEAM_ABBREVIATION"],
                "position": get_position(row["PLAYER_ID"]),  # Position not in stats endpoint
                "GP": int(row["GP"]),
                "MIN": float(row["MIN"]),
                "PTS": float(row["PTS"]),
                "REB": float(row["REB"]),
                "AST": float(row["AST"]),
                "STL": float(row["STL"]),
                "BLK": float(row["BLK"]),
                "FGA": float(row["FGA"]),
                "FGM": float(row["FGM"]),
                "FTA": float(row["FTA"]),
                "FTM": float(row["FTM"]),
                "THREE_PA": float(row["FG3A"]),
                "THREE_PM": float(row["FG3M"]),
                "TOV": float(row["TOV"]),
                "ORB": float(row["OREB"]),
                "DRB": float(row["DREB"]),
                "PF": float(row["PF"])
            }
            player_data.append(player)

        return player_data

    except Exception as e:
        print(f"Error fetching stats: {e}", file=sys.stderr)
        return []


def get_position(player_id: int) -> str:
    """
    Get player position from commonplayerinfo endpoint
    """
    try:
        player_info = commonplayerinfo.CommonPlayerInfo(player_id=player_id)
        df = player_info.get_data_frames()[0]
        if not df.empty and 'POSITION' in df.columns:
            position = df['POSITION'].iloc[0]
            print(f"Player ID: {player_id}, Position: {position}", file=sys.stderr)
            return position
        print(f"Player ID: {player_id}, Position: UNK (no data)", file=sys.stderr)
        return "UNK"
    except Exception as e:
        print(f"Player ID: {player_id}, Position: UNK (error: {e})", file=sys.stderr)
        return "UNK"


def main():
    parser = argparse.ArgumentParser(description="Scrape NBA player stats")
    parser.add_argument("--season", default="2025-26", help="Season in format YYYY-YY")
    parser.add_argument("--output", help="Output file (default: stdout)")

    args = parser.parse_args()

    # Fetch stats
    player_stats = fetch_player_stats(args.season)

    # Output JSON
    output = json.dumps(player_stats, indent=2)

    if args.output:
        with open(args.output, 'w') as f:
            f.write(output)
        print(f"Wrote {len(player_stats)} players to {args.output}", file=sys.stderr)
    else:
        print(output)


if __name__ == "__main__":
    main()
