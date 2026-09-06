---
type: PostgreSQL Table
title: Company
description: Top-level tenant container.
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
| `name` | TEXT | Display name of the company. |
| `currency` | TEXT | Default currency (e.g. INR). |

# Notes for consumers

- All other entities (Departments, Employees) belong to a Company.

[^schema]: Prisma Schema
