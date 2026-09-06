---
type: Service
title: PayCore API
description: RESTful API routes served by Next.js covering auth, employees, and payroll logic.
resource: app/api/
tags: [backend, nextjs, api]
generated: { by: okf-bundle-generator/antigravity, at: 2026-09-06T00:05:50.060Z }
sources:
  - id: api
    resource: app/api/
    title: API Directory
---

# What it is

The backend processing engine built into the Next.js API Routes (`/api/*`).

# Responsibilities

- **Authentication**: Validates JWT session cookies and rate-limits login attempts (via Redis).
- **Payroll Computation**: Automatically generates payslips when a Payrun is computed, calculating basic, deductions, and pro-rata leave.
- **Audit Logging**: Intercepts create/update/delete actions to write an immutable audit log.

# Data owned

- It is the sole writer to all Prisma tables described in the [data layer](../data/index.md).
