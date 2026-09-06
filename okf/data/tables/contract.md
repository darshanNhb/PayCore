---
type: PostgreSQL Table
title: Contract
description: Employee compensation and schedule terms.
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
| `employeeId` | UUID | Links to [`Employee`](employee.md). |
| `wagePerMonth` | DECIMAL | Base salary per month. |
| `status` | ENUM | `DRAFT`, `RUNNING`, `EXPIRED`, `CANCELLED`. |

# Notes for consumers

- Only one `RUNNING` contract per employee should exist at any given time.

[^schema]: Prisma Schema
