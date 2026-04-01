import { BadgeRecord } from '@nba-draft-sim/shared';

export function groupBadgesByCategory(badges: BadgeRecord[]): Record<string, BadgeRecord[]> {
  return badges.reduce<Record<string, BadgeRecord[]>>((acc, badge) => {
    acc[badge.category] = acc[badge.category] ?? [];
    acc[badge.category].push(badge);
    return acc;
  }, {});
}
