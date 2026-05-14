import { describe, expect, it } from 'vitest';
import {
  FRONT_OFFICE_DATASET_SCHEMA_VERSION,
  FRONT_OFFICE_LEAGUE_TEAM_COUNT,
  FRONT_OFFICE_VALIDATION_STATUSES,
} from './schema';

describe('front office shared schema constants', () => {
  it('defines stable foundation constants', () => {
    expect(FRONT_OFFICE_DATASET_SCHEMA_VERSION).toBe(1);
    expect(FRONT_OFFICE_LEAGUE_TEAM_COUNT).toBe(30);
    expect(FRONT_OFFICE_VALIDATION_STATUSES).toEqual([
      'valid',
      'warning',
      'invalid',
    ]);
  });
});
