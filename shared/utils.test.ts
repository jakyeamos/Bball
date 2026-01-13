import { describe, it, expect } from 'vitest';
import { calculateWinPercentage } from './utils';

describe('calculateWinPercentage', () => {
  it('should return 0.5 for a 10-10 record', () => {
    const record = { wins: 10, losses: 10 };
    expect(calculateWinPercentage(record)).toBe(0.5);
  });

  it('should return 1.0 for a 10-0 record', () => {
    const record = { wins: 10, losses: 0 };
    expect(calculateWinPercentage(record)).toBe(1.0);
  });

  it('should return 0.0 for a 0-10 record', () => {
    const record = { wins: 0, losses: 10 };
    expect(calculateWinPercentage(record)).toBe(0.0);
  });

  it('should return 0 for a 0-0 record', () => {
    const record = { wins: 0, losses: 0 };
    expect(calculateWinPercentage(record)).toBe(0);
  });

  it('should handle fractional results correctly', () => {
    const record = { wins: 1, losses: 2 };
    expect(calculateWinPercentage(record)).toBeCloseTo(0.333333);
  });
});
