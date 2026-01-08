// client/src/services/api.ts

import { TeamAggregation } from '@nba-draft-sim/shared';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'API request failed');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`API Error (${endpoint}):`, error);
    throw error;
  }
}

export const apiService = {
  aggregateTeam: (
    playerIds: string[],
    teamId: string
  ): Promise<TeamAggregation> => {
    return fetchApi<TeamAggregation>('/api/team/aggregate', {
      method: 'POST',
      body: JSON.stringify({ playerIds, teamId }),
    });
  },
};
