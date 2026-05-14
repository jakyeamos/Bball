import { describe, expect, it } from 'vitest';
import { CBA_2026_CONSTANTS } from './constants/2026';
import { CBA_2026_CITATIONS, findCbaCitation } from './citations/2026';

describe('2026 CBA constants and citations', () => {
  it('exposes cap, tax, apron, roster, and cash constants', () => {
    expect(CBA_2026_CONSTANTS.season_year).toBe(2026);
    expect(CBA_2026_CONSTANTS.salary_cap_millions).toBeGreaterThan(0);
    expect(CBA_2026_CONSTANTS.luxury_tax_millions).toBeGreaterThan(
      CBA_2026_CONSTANTS.salary_cap_millions
    );
    expect(CBA_2026_CONSTANTS.first_apron_millions).toBeGreaterThan(
      CBA_2026_CONSTANTS.luxury_tax_millions
    );
    expect(CBA_2026_CONSTANTS.second_apron_millions).toBeGreaterThan(
      CBA_2026_CONSTANTS.first_apron_millions
    );
    expect(CBA_2026_CONSTANTS.standard_roster_limit).toBe(15);
    expect(CBA_2026_CONSTANTS.two_way_roster_limit).toBe(3);
    expect(CBA_2026_CONSTANTS.trade_cash_limit_millions).toBeGreaterThan(0);
  });

  it('can look up citations by rule id', () => {
    expect(CBA_2026_CITATIONS.length).toBeGreaterThanOrEqual(6);
    expect(findCbaCitation('league-dataset-completeness')?.title).toBe(
      'Complete league dataset required'
    );
    expect(findCbaCitation('salary-cap-system')?.url).toContain('nba.com');
  });
});
