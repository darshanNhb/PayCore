---
type: PostgreSQL Table
title: WorkingSchedule
description: Defines working hours for employees.
resource: prisma/schema.prisma
tags: [database, schema]
generated: { by: okf-bundle-generator/antigravity, at: 2026-09-06T00:05:50.060Z }
sources:
  - id: schema
    resource: prisma/schema.prisma
    title: Prisma Schema
---

# Schema

| Column | Type | Description |
|---|---|---|
| `id` | UUID | Primary key. |
| `name` | TEXT | E.g. "India — Standard 40h". |
| `timezone` | TEXT | Timezone mapping. |

# Notes for consumers

- Used by attendance rules and payroll pro-ration.

[^schema]: Prisma Schema
