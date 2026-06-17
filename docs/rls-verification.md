# Row-Level Security (RLS) Verification Guide

DouseFire stores all tenant data in Supabase Postgres. Because RLS policies live
in the Supabase dashboard (there is no `supabase/migrations` folder in this repo),
this document is the source of truth for **what the policies must enforce** and
**how to verify them**. Run the checks below after any policy change.

## 1. Why this matters (OWASP A01: Broken Access Control)

The `anon` and `authenticated` keys are shipped to the browser. The only thing
preventing one customer/technician from reading another's data is RLS. If RLS is
disabled or a policy is too permissive, every row is effectively public.

A quick smoke signal: an **unauthenticated** REST read of a protected table must
fail or return `[]`. During testing the raw `anon` probe returned an error /
empty set — that is the **expected, secure** result.

## 2. Tables that MUST have RLS enabled

| Table                  | Read scope                                  | Write scope                          |
| ---------------------- | ------------------------------------------- | ------------------------------------ |
| `customers`            | staff (admin/manager/technician)            | admin/manager                        |
| `assets`               | staff                                       | admin/manager                        |
| `inspections`          | staff; technician limited to assigned       | technician (own), admin/manager      |
| `deficiencies`         | staff                                       | technician (own inspection), admin/manager |
| `proposals`            | staff; customer via portal (own only)       | admin/manager                        |
| `work_orders`          | staff                                       | admin/manager; technician status only |
| `invoices` / `payments`| staff; customer via portal (own only)       | admin/manager                        |
| `users` / `profiles`   | own row + admin                             | admin (others), self (own profile)   |
| `audit_logs`           | admin/manager                               | system (service role) only           |

> "staff" = an authenticated user whose `profiles.role` is `admin`, `manager`, or
> `technician`. "customer via portal" = an authenticated portal user matched on
> `customer_id`.

## 3. Verification — SQL (run in Supabase → SQL Editor)

### 3a. Confirm RLS is ENABLED on every public table

```sql
select c.relname as table_name,
       c.relrowsecurity as rls_enabled,
       c.relforcerowsecurity as rls_forced
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
order by c.relname;
```

**Pass criteria:** `rls_enabled = true` for every table listed in section 2.
Any `false` is a finding — enable it: `alter table public.<t> enable row level security;`

### 3b. List the policies that exist on each table

```sql
select schemaname, tablename, policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'public'
order by tablename, cmd;
```

**Pass criteria:** every table in section 2 has at least a `SELECT` policy, and
write tables have explicit `INSERT`/`UPDATE`/`DELETE` policies. A table with RLS
enabled but **zero** policies denies all access (safe but broken app); a table
with a `USING (true)` policy on `SELECT` for `anon` is a **critical leak**.

### 3c. Flag dangerously permissive policies

```sql
select tablename, policyname, roles, cmd, qual
from pg_policies
where schemaname = 'public'
  and (qual = 'true' or qual is null)
  and ('anon' = any(roles) or 'public' = any(roles));
```

**Pass criteria:** zero rows. Any row here means an unauthenticated user can read
or write that table.

## 4. Verification — live REST probes (automated)

Run the probe script to confirm the anon key cannot read protected tables:

```powershell
node scripts/verify-rls.mjs
```

It reads `VITE_PUBLIC_SUPABASE_URL` / `VITE_PUBLIC_SUPABASE_ANON_KEY` from the
environment (or `.env`) and asserts that an **anonymous** select on each protected
table returns no rows. A non-empty result is reported as a FAIL.

To also verify *positive* access (a logged-in technician can read their data, a
customer cannot read another customer's), supply test credentials:

```powershell
$env:RLS_TEST_TECH_EMAIL="tech@example.com";  $env:RLS_TEST_TECH_PASSWORD="..."
$env:RLS_TEST_CUST_EMAIL="portal@example.com"; $env:RLS_TEST_CUST_PASSWORD="..."
node scripts/verify-rls.mjs --authenticated
```

## 5. Open findings (from `node --use-system-ca scripts/verify-rls.mjs`)

> Initial run flagged **2 anon-readable tables**: `inspections` and `invoices`.

**Root cause:** the customer portal (`src/pages/portal/page.tsx`) authenticated a
customer only by typing an email, then read `inspections` and `invoices` with the
public **anon** key, filtering by `customer_id` *on the client*. The matching anon
`SELECT` policy therefore exposed **every** customer's inspections and invoices to
anyone holding the (browser-shipped) anon key — not just their own rows.

### Fix shipped in the app (code)

The portal now verifies the customer's identity with a **one-time email code**
(Supabase built-in email OTP) before showing any data:

- New isolated client `src/lib/portalClient.ts` (separate `storageKey`) so a
  customer's portal session never collides with a staff dashboard session.
- `src/pages/portal/page.tsx` now does `signInWithOtp` → `verifyOtp`, then reads
  every table through the authenticated portal client. Reads are scoped by RLS to
  the signed-in customer instead of being filtered only in the browser.

### Required dashboard step (run this SQL, then re-probe)

The code change only takes effect once the **authenticated** policies below exist
and the **anon** leak policies are dropped. Run in Supabase → SQL Editor:

```sql
-- 1) Let a verified portal customer read ONLY their own rows.
--    auth.email() is the email they proved ownership of via the OTP.
create policy "portal reads self customer" on public.customers
  for select to authenticated
  using (lower(email) = lower(auth.email()));

create policy "portal reads own inspections" on public.inspections
  for select to authenticated
  using (customer_id in (select id from public.customers where lower(email) = lower(auth.email())));

create policy "portal reads own invoices" on public.invoices
  for select to authenticated
  using (customer_id in (select id from public.customers where lower(email) = lower(auth.email())));

create policy "portal reads own payments" on public.payments
  for select to authenticated
  using (customer_id in (select id from public.customers where lower(email) = lower(auth.email())));

create policy "portal creates own requests" on public.service_requests
  for insert to authenticated
  with check (customer_id in (select id from public.customers where lower(email) = lower(auth.email())));

-- 2) Remove the permissive anon SELECT policies that leaked data.
--    Find the exact names first with the query in section 3b, then:
drop policy if exists "<anon select policy on inspections>" on public.inspections;
drop policy if exists "<anon select policy on invoices>"    on public.invoices;
```

> Keep the existing **staff** policies (admin/manager/technician) intact — these
> new policies are additive and only grant a portal customer access to their own
> rows. Do not drop the anon policies *before* adding the authenticated ones or
> the portal tabs will go blank.

## 6. Sign-off checklist

- [ ] 3a — RLS enabled on all section-2 tables
- [ ] 3b — every table has the expected policies
- [ ] 3c — no permissive `anon`/`public` policies
- [ ] 5 — `inspections` / `invoices` anon leak remediated
- [ ] 4 — `node scripts/verify-rls.mjs` passes (anon blocked)
- [ ] 4 — authenticated probes pass (tech sees own data, customer isolated)
- [ ] Re-run after every policy change and before each production deploy
