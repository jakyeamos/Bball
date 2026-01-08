/**
 * server/stores/leagueStore.ts
 * 
 * Simple in-memory store for league state
 */

import { LeagueState } from '@nba-draft-sim/shared';

const leagues = new Map<string, LeagueState>();

export const leagueStore = {
  /**
   * Get league by ID
   */
  get(leagueId: string): LeagueState | undefined {
    return leagues.get(leagueId);
  },
  
  /**
   * Set league state (overwrites existing)
   */
  set(leagueId: string, state: LeagueState): LeagueState {
    leagues.set(leagueId, state);
    return state;
  },
  
  /**
   * Update league state (merges with existing)
   */
  update(leagueId: string, updates: Partial<LeagueState>): LeagueState | undefined {
    const existing = leagues.get(leagueId);
    if (!existing) return undefined;
    
    const updated: LeagueState = { 
      ...existing, 
      ...updates, 
      updatedAt: new Date().toISOString() 
    };
    
    leagues.set(leagueId, updated);
    return updated;
  },
  
  /**
   * Delete league
   */
  delete(leagueId: string): boolean {
    return leagues.delete(leagueId);
  },
  
  /**
   * Get all leagues
   */
  getAll(): LeagueState[] {
    return Array.from(leagues.values());
  },
  
  /**
   * Clear all leagues (for testing)
   */
  clear(): void {
    leagues.clear();
  },
};