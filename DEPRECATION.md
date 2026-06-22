# Bballedu Deprecation Notice

Bballedu is deprecated as a standalone product repository.

BBDSE is now the canonical home for Court Vision UI routes, lesson-library data, draft entry surfaces, and offseason simulator pages. Do not add new product UI to this repository.

Allowed changes here are limited to:

- reading source history while completing the BBDSE merge;
- extracting remaining runtime or test logic into BBDSE;
- fixing a migration blocker that cannot be resolved from BBDSE alone;
- archiving documentation after parity is verified.

The target replacement repo is:

`/Users/jakyeamos/projects/BBDSE/BBDS-Analytics-Product-Suite`

Deprecation started after BBDSE added:

- Court Vision route ownership under `/court-vision`;
- migrated lesson seed data and lesson pages;
- former Bballedu client routes as BBDSE Court Vision routes;
- offseason Team Context through Recap pages;
- Vercel preview deployment verification for the merged route tree.
