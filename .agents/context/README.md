---
id: bballedu.repo-context
title: Bballedu Repo Context
tier: project
status: active
last_reviewed: 2026-07-22
applies_when:
  - repo_context
tags:
  - bballedu
  - context
---

# Bballedu Repo Context

Read this index before non-trivial work in this repo. Load only the packet needed for the current task; keep repository-wide discovery out of the prompt.

## Read When

| Task evidence | Read |
| --- | --- |
| External-facing strategy, launch, market, or audience research | [`market.md`](market.md) |
| CLI/API/tool publishing or command-surface work | [`README.md`](../../README.md) |
| Running checks or builds | [`README.md`](../../README.md) and the root `package.json` scripts |
| Assurance or certification setup | The root README, .quality-runner.toml, and .pronto/behavior-assurance.json |

This repository has no local `commands.md` or `printing-press.md`; do not infer either file. Keep stable repo detail here only when it helps agents avoid rediscovery.
