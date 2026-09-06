---
type: PostgreSQL Table
title: SalaryStructure
description: Defines parent structures for payruns.
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
| `name` | TEXT | E.g. "Regular Salary". |

# Notes for consumers

- Salary Rules belong to Salary Structures to form a complete payment graph.

[^schema]: Prisma Schema
