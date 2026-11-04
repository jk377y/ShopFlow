# ShopFlow Architecture

This is the reference for the agreed architecture and the reasons behind it. Keep it in sync with the code: update it whenever an approved architectural change is implemented.

**Implementation status:** Milestone 1 (foundation) is complete. Everything below marked *(planned)* is designed and approved but not built yet.

## 1. Overview

ShopFlow is a small manufacturing inventory and order management app. It is a learning project, not a production ERP. It is meant for **local development only**: there is no authentication in v1, and the app listens on `127.0.0.1` only.

```
Browser (HTML/CSS/vanilla JS)
   │  fetch() → JSON over HTTP, same origin
   ▼
ASP.NET Core (.NET 10), one process
   ├─ Static files (wwwroot)      the frontend pages
   ├─ Minimal API endpoints       HTTP in/out, validation, DTO mapping
   ├─ Services (planned)          business rules
   └─ EF Core + Npgsql (planned)  data access
   ▼
PostgreSQL (local on each machine) (planned)
```

| Component | Responsibility |
|---|---|
| Frontend (`wwwroot`) | Multi-page UI. Shared `css/site.css` and `js/api.js`. Renders data with `textContent`, never `innerHTML`. |
| Endpoints (`Endpoints/`) | HTTP only: parse the request, call a service, shape the response. One file per resource. |
| Services *(planned)* | Business rules (order status changes, fulfillment, stock changes). No HTTP types. |
| Data layer *(planned)* | `ShopFlowDbContext`, entity configuration, migrations, seeding. |

## 2. Technology choices

| Choice | Why |
|---|---|
| ASP.NET Core Minimal APIs | Less boilerplate than controllers, and good for a small app. Endpoint files plus services keep it organized. |
| One web project plus one test project | Folders give the same separation as extra class libraries without the overhead. Split later if it grows. |
| Backend serves the frontend | Same origin means no CORS and no second dev server or Node tooling. |
| PostgreSQL + EF Core *(planned)* | Real relational database with strong constraints. EF Core migrations make the schema reproducible. |
| Vanilla HTML/CSS/JS, multi-page | No framework or build step. Simple to learn and debug. |
| xUnit + real PostgreSQL for integration tests *(planned)* | In-memory and SQLite providers don't enforce the same constraints or locking, so they would hide the bugs we care about. No Docker required. |

## 3. Configuration and security

- The app listens on `http://127.0.0.1:5080` (`Urls` in `appsettings.json`; override with the `Urls` environment variable). It uses `127.0.0.1` rather than `localhost` to avoid IPv4/IPv6 surprises.
- `AllowedHosts` is `localhost;127.0.0.1`, so requests with any other `Host` header get a 400. This is an extra guard, not a substitute for authentication.
- Plain HTTP only. The dev HTTPS certificate is awkward to trust on Linux, and traffic never leaves the machine.
- **Database passwords** *(planned)* live only in .NET User Secrets (stored outside the repo), with an environment-variable override. Host, port, database and user go in `appsettings.json`. Passwords are never committed, logged, or printed.
- `global.json` pins the .NET 10 SDK band (`rollForward: latestFeature`) so both machines build the same way.
- Backend validation is the source of truth. Frontend checks are only for convenience.

## 4. Database schema *(planned, Milestone 2)*

All tables use an `int` identity primary key. Timestamps are `timestamptz` (UTC). Money is `numeric(12,2)`.

| Table | Key columns | Notes |
|---|---|---|
| Customers | Id, Name, Email (unique), Phone, IsActive, CreatedAt, UpdatedAt | Deactivate, never delete |
| Products | Id, Sku (unique), Name, Description, UnitPrice, QuantityOnHand, ReorderLevel, IsActive, CreatedAt, UpdatedAt | `CHECK (QuantityOnHand >= 0)` |
| Orders | Id, OrderNumber (unique), CustomerId → Customers, Status, OrderDate, Notes, CreatedAt, UpdatedAt | Status stored as text |
| OrderItems | Id, OrderId → Orders (cascade), ProductId → Products (restrict), Quantity, UnitPrice | `CHECK (Quantity > 0)`, unique (OrderId, ProductId) |
| OrderStatusHistory | Id, OrderId → Orders, FromStatus (nullable), ToStatus, ChangedAt, Note | Append-only. The first row is null → Draft. |
| InventoryTransactions | Id, ProductId → Products, QuantityChange, Reason, OrderId (nullable), CreatedAt | Append-only stock ledger |

Design choices:
- `OrderItems.UnitPrice` is a snapshot of the product price when the item is added, so later price changes don't rewrite history.
- Order totals are computed, not stored, so they can't drift.
- Products and customers are never hard-deleted because orders reference them.

## 5. Business rules *(planned)*

**Order lifecycle**

```
Draft ──► Confirmed ──► Fulfilled   (terminal)
  └───────────┴──────► Cancelled    (terminal)
```

- Draft orders can be edited. Confirmed orders are locked.
- Cancelling is allowed only from Draft or Confirmed, and never touches inventory.
- Stock is **not** reserved on confirmation. Inventory changes only at fulfillment.
- Every status change writes an `OrderStatusHistory` row.
- Inactive products can't be added to new orders. A confirmed order containing a product that was later deactivated can still be fulfilled if stock is sufficient.

**Inventory**

- `QuantityOnHand` always equals the sum of that product's `InventoryTransactions`. Only `InventoryService` changes it, and product update requests have no quantity field. Initial and seeded stock write an "Initial stock" ledger row.
- Manual adjustments require a reason. Quantity can never go negative.
- Each change is an atomic conditional update (`UPDATE … WHERE QuantityOnHand >= @q`) inside a database transaction, backed by the `CHECK` constraint.

**Fulfillment** runs in a single transaction: verify the order is Confirmed, decrement every item (in ProductId order, to avoid deadlocks), write ledger rows, set the status, and write the history row. If any item is short, everything rolls back and the API returns 409 listing the shortfalls.

## 6. API *(planned)*

JSON under `/api`. Errors use `ProblemDetails` (400 validation, 404 not found, 409 conflict or insufficient stock). Status changes are explicit action endpoints (`/confirm`, `/fulfill`, `/cancel`) rather than a settable status field, because they carry rules and side effects.

Built so far: `GET /api/health`.
Planned: products (plus `adjust-stock`, activate/deactivate), customers, orders (plus items and status actions), order history, and `GET /api/dashboard`.

## 7. Database initialization and setup *(planned)*

- `dotnet run --project src/ShopFlow.Web -- db init` applies pending migrations, then runs the idempotent seeder, then exits. Migrations never run on normal app startup.
- The seeder is code (not EF `HasData`). It looks up natural keys (SKU, email, order number) and inserts only what's missing, and never updates or deletes existing rows. Seeded stock gets matching ledger rows.
- `scripts/setup.sh` (Fedora) and `scripts/setup.ps1` (Windows) check prerequisites, print instructions if something is missing, and never install software. With explicit confirmation they create a dedicated `shopflow` role and database, prompt for a hidden and confirmed password, and store it in User Secrets. An existing role's password is never changed. Both scripts then call `db init`, and both are safe to rerun.
- Setup docs: this README for the quick start, and `docs/setup.md` for details.

## 8. Cross-platform notes

- `.gitattributes` forces LF for `*.sh` and `*.sql`, and CRLF for `*.ps1`.
- `setup.sh` needs its executable bit committed to Git.
- Fedora PostgreSQL gotchas: a fresh install needs `postgresql-setup --initdb`, and `pg_hba.conf` defaults to `ident` auth over TCP, which rejects password logins.
- Windows: `psql` is often not on PATH after install, and PowerShell may need `-ExecutionPolicy Bypass -File` for scripts.
- After switching machines, `git pull` and rerun `db init` to catch up on migrations. Data stays per machine.
- Create EF migrations on one machine at a time and commit before switching, because model snapshot conflicts are painful to merge.
- Windows 11 compatibility is verified when development moves to that machine.

## 9. Limitations

No authentication, no stock reservation, no returns or reversal of fulfilled orders, no multi-currency or tax, and no production hardening. Local use only.
