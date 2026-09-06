---
type: Script
title: Seed Leave & Employees
description: Generates a realistic set of company data for testing.
resource: scripts/seed-leave.ts
tags: [script, database, seeding]
generated: { by: okf-bundle-generator/antigravity, at: 2026-09-06T00:05:50.060Z }
sources:
  - id: seed
    resource: scripts/seed-leave.ts
    title: Seed Script
---

# What it does

Truncates the database and populates it with a dummy Company, Departments, Working Schedules, Time Off Types, Salary Structures, and Employees. Used primarily for local development and demonstration environments.[^seed]

# Usage

    npx tsx scripts/seed-leave.ts

[^seed]: Seed Script
