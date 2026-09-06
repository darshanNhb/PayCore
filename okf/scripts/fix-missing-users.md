---
type: Script
title: Fix Missing Users
description: Backfills missing User accounts for Employees.
resource: scripts/fix-missing-users.ts
tags: [script, maintenance]
generated: { by: okf-bundle-generator/antigravity, at: 2026-09-06T00:05:50.060Z }
sources:
  - id: script
    resource: scripts/fix-missing-users.ts
    title: Fix Script
---

# What it does

Scans all active employees in the database and automatically generates a `User` account with a default password for any employee missing one.[^script]

# Usage

    npx tsx scripts/fix-missing-users.ts

[^script]: Fix Script
