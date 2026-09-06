---
type: PostgreSQL Table
title: AttendanceRecord
description: Check-in and check-out logs.
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
| `checkIn` | TIMESTAMPTZ | Time of check in. |
| `checkOut` | TIMESTAMPTZ | Time of check out. Null if currently checked in. |

# Notes for consumers

- If `checkOut` is null, the employee is currently active on the clock.

[^schema]: Prisma Schema
