import { FrontOfficeRuleCitation } from '@nba-draft-sim/shared';

export const CBA_2026_CITATIONS: FrontOfficeRuleCitation[] = [
  {
    rule_id: 'league-dataset-completeness',
    title: 'Complete league dataset required',
    source: 'nba_cba',
    locator:
      'Implementation gate derived from CBA-dependent roster, salary, rights, and transaction rules',
    url: 'https://nbpa.com/cba',
    summary:
      'A near-real offseason simulator must know each team roster, contract, rights, exceptions, and draft obligations before issuing legal rulings.',
  },
  {
    rule_id: 'salary-cap-system',
    title: 'Salary cap and team salary system',
    source: 'nba_cba_101',
    locator: 'NBA CBA 101: Salary Cap and Tax Level overview',
    url: 'https://cms.nba.com/wp-content/uploads/sites/4/2024/11/2024-25-CBA-101.pdf',
    summary:
      'Team transaction legality depends on salary cap, tax, apron, exceptions, and team salary calculations.',
  },
  {
    rule_id: 'roster-size',
    title: 'Standard and two-way roster limits',
    source: 'nba_cba_101',
    locator: 'NBA CBA 101: roster composition concepts',
    url: 'https://cms.nba.com/wp-content/uploads/sites/4/2024/11/2024-25-CBA-101.pdf',
    summary:
      'Teams must maintain legal standard and two-way roster counts during offseason compliance checks.',
  },
  {
    rule_id: 'draft-pick-ledger',
    title: 'Draft pick ownership and trade restrictions',
    source: 'nba_cba',
    locator:
      'CBA draft and trade rules; exact article/section to be attached when encoding pick validators',
    url: 'https://nbpa.com/cba',
    summary:
      'Draft assets require exact ownership, protection, swap, conveyance, and encumbrance data before pick trades can be validated.',
  },
  {
    rule_id: 'free-agent-rights',
    title: 'Free-agent rights and cap holds',
    source: 'nba_cba_101',
    locator: 'NBA CBA 101: free agency, exceptions, and cap holds',
    url: 'https://cms.nba.com/wp-content/uploads/sites/4/2024/11/2024-25-CBA-101.pdf',
    summary:
      'Free-agent cap holds and rights affect team salary and contract tools.',
  },
  {
    rule_id: 'apron-system',
    title: 'First apron and second apron system',
    source: 'nba_cba_101',
    locator: 'NBA CBA 101: apron restrictions',
    url: 'https://cms.nba.com/wp-content/uploads/sites/4/2024/11/2024-25-CBA-101.pdf',
    summary:
      'Teams above apron thresholds face transaction restrictions that validators must consider.',
  },
];

export function findCbaCitation(
  ruleId: string
): FrontOfficeRuleCitation | undefined {
  return CBA_2026_CITATIONS.find((citation) => citation.rule_id === ruleId);
}
