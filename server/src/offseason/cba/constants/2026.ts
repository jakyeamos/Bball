export interface CbaSeasonConstants {
  season_year: number;
  rules_version: string;
  salary_cap_millions: number;
  luxury_tax_millions: number;
  first_apron_millions: number;
  second_apron_millions: number;
  standard_roster_limit: number;
  standard_roster_minimum: number;
  two_way_roster_limit: number;
  max_cash_received_millions: number;
  trade_cash_limit_millions: number;
  trade_matching_allowance_millions: number;
  expanded_trade_exception_fixed_millions: number;
}

export const CBA_2026_CONSTANTS: CbaSeasonConstants = {
  season_year: 2026,
  rules_version: '2026-upcoming-offseason-v1',
  salary_cap_millions: 154.6,
  luxury_tax_millions: 187.9,
  first_apron_millions: 195.9,
  second_apron_millions: 207.8,
  standard_roster_limit: 15,
  standard_roster_minimum: 14,
  two_way_roster_limit: 3,
  max_cash_received_millions: 7.6,
  trade_cash_limit_millions: 7.6,
  trade_matching_allowance_millions: 0.25,
  expanded_trade_exception_fixed_millions: 8.525,
};
