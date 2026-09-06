---
type: PostgreSQL Table
title: TimeOffRequest
description: Requests for leave by employees.
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
| `startDate` | TIMESTAMPTZ | Leave start date. |
| `status` | ENUM | `TO_APPROVE`, `APPROVED`, `REFUSED`, `CANCELLED`. |

# Notes for consumers

- Approved time off deducts from the linked allocation and adjusts payroll.

[^schema]: Prisma Schema
