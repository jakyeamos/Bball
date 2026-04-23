import { describe, expect, it } from 'vitest';
import {
  applyTendencyToValuation,
  buildCoachTendencyProfile,
  listCoachProfiles,
} from './coachTendencyEffects';

describe('coach tendency effects', () => {
  it('builds a normalized coach pool from seed data', () => {
    const coaches = listCoachProfiles();
    expect(coaches.length).toBeGreaterThanOrEqual(30);
    expect(coaches.some((coach) => coach.id.includes('mazzulla'))).toBe(true);
  });

  it('produces stronger pace and spacing bias for fast spacing coaches', () => {
    const coaches = listCoachProfiles();
    const mazzulla = coaches.find((coach) =>
      coach.head_coach_name.includes('Mazzulla')
    );
    const thibodeau = coaches.find((coach) =>
      coach.head_coach_name.includes('Thibodeau')
    );

    expect(mazzulla).toBeDefined();
    expect(thibodeau).toBeDefined();

    const mazzullaProfile = buildCoachTendencyProfile(mazzulla!);
    const thibodeauProfile = buildCoachTendencyProfile(thibodeau!);

    expect(mazzullaProfile.pace_bias).toBeGreaterThan(thibodeauProfile.pace_bias);
    expect(mazzullaProfile.spacing_bias).toBeGreaterThan(
      thibodeauProfile.spacing_bias
    );
  });

  it('applies tendency biases directly to valuation dimensions', () => {
    const adjusted = applyTendencyToValuation(
      {
        pace: 0,
        spacing: 0,
        rim_pressure: 0,
        defense: 0,
        development: 0,
      },
      {
        pace_bias: 0.07,
        spacing_bias: 0.05,
        rim_pressure_bias: -0.02,
        defense_bias: 0.03,
        development_bias: 0.06,
      }
    );

    expect(adjusted.pace).toBe(0.07);
    expect(adjusted.spacing).toBe(0.05);
    expect(adjusted.rim_pressure).toBe(-0.02);
    expect(adjusted.defense).toBe(0.03);
    expect(adjusted.development).toBe(0.06);
  });
});

