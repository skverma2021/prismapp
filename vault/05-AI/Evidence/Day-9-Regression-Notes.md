# Day 9 Regression Notes

Status: Active
Date: 2026-03-31
Owner: Engineering

## Purpose
Track core API regression commands and expected outcomes for hardening verification.

## Core API Suites
1. `npm run test:api:timelines`
2. `npm run test:api:contribution-rates`
3. `npm run test:api:contributions`
4. `npm run test:api:reports`

## Expected Outcome
1. All suites pass without manual intervention.
2. No regressions in overlap checks, contribution capture/corrections, or reports endpoints.
3. Authorization behavior remains consistent for report endpoints.

## Execution Notes
1. Execute after UI hardening changes that alter request behavior or error handling.
2. If a suite fails, record the failing endpoint and payload context before fixes.
