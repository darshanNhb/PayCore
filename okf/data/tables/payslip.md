---
type: PostgreSQL Table
title: Payslip
description: Individual employee salary calculation for a payrun.
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
| `payrunId` | UUID | Links to [`Payrun`](payrun.md). |
| `netAmount` | DECIMAL | Final computed net pay. |
| `hasWarnings` | BOOLEAN | True if missing bank details or negative pay. |

# Notes for consumers

- Generated automatically during Payrun computation. Paid payslips trigger PDF email delivery.

[^schema]: Prisma Schema
