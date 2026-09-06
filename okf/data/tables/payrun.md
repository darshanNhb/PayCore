---
type: PostgreSQL Table
title: Payrun
description: Batch payroll processing records.
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
| `periodStart` | TIMESTAMPTZ | Start of the payroll period. |
| `status` | ENUM | `DRAFT`, `COMPUTED`, `VALIDATED`, `PAID`. |

# Notes for consumers

- When validated, the payrun generates Payslips for all eligible employees.

[^schema]: Prisma Schema
