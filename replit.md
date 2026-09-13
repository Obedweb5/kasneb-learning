# KASNEB Learning Hub

KASNEB-focused learning marketplace for CPA units, revision notes, past papers, video tutorials, student progress, and M-Pesa checkout.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Demo mode is active until `MONGODB_URI` and the Daraja secrets are added through the secure environment settings.
- Live payment configuration uses `DARAJA_CONSUMER_KEY`, `DARAJA_CONSUMER_SECRET`, `DARAJA_PASSKEY`, and `DARAJA_SHORTCODE`.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- Data: seeded demo store now; MongoDB adapter is the intended production persistence layer
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/kasneb-learning` — React + Vite storefront, study dashboard, checkout, admin, and contact pages
- `artifacts/api-server/src/routes/kasneb.ts` — catalog, learning, checkout, admin, and contact API routes
- `artifacts/api-server/src/lib/demoData.ts` — seeded demo catalog and learning data
- `lib/api-spec/openapi.yaml` — source of truth for the typed API contract
- `lib/api-client-react/src/generated` — generated React Query client hooks
- `artifacts/kasneb-learning/src/index.css` — Exam Desk visual theme and responsive tokens

## Architecture decisions

- The frontend consumes typed OpenAPI-generated hooks so catalog, learning, payment, admin, and contact flows share one contract.
- The first build runs with visible demo data instead of pretending a payment or file upload completed without live credentials.
- Daraja checkout returns a pending payment record; live STK push behavior is enabled by the Daraja environment values.
- User-uploaded videos and documents should use App Storage for bytes and MongoDB for metadata once authentication and storage setup are added.

## Product

- Students can browse KASNEB-aligned CPA units, inspect course units and resources, enroll, track study progress, and initiate M-Pesa checkout.
- Admins can view revenue/resource overview, create courses, and add learning resources.
- The contact page provides a support message path for students.

## User preferences

- The product should support CPA units, past papers, notes, and video tutorials.
- Payment provider requested: Daraja M-Pesa.
- Intended database: MongoDB.

## Gotchas

- Run `pnpm --filter @workspace/api-spec run codegen` after changing `lib/api-spec/openapi.yaml`.
- Do not treat demo payment records as real transactions; add Daraja credentials before accepting live payments.
- Do not store uploaded video or document bytes in MongoDB; use object storage and retain metadata/path references in the database.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
