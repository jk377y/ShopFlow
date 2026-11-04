# ShopFlow: Architecture and Implementation Proposal

Nothing has been created or changed. This is the proposal for your review. I've flagged the decisions I need from you in section 9.

## 1. Application architecture

```
Browser (HTML/CSS/vanilla JS)
   │  fetch() → JSON over HTTP, same origin
   ▼
ASP.NET Core (.NET 10), one process
   ├─ Static files (wwwroot)   serves the frontend
   ├─ API endpoints (/api/*)   HTTP, validation, DTO mapping
   ├─ Services                 business rules (fulfillment, status changes)
   └─ EF Core DbContext        Npgsql provider
   ▼
PostgreSQL (local on each machine)
```

- **One ASP.NET Core app serves both the frontend and the API.** Everything is same-origin, so there's no CORS setup, no second dev server, and no Node tooling. It also keeps the project small.
- **Layering:** endpoints stay thin, and services own the business rules. Fulfillment logic must not live in an HTTP handler, because that makes it hard to test and reuse.
- **DTOs:** the API never returns EF entities directly. DTOs keep the wire format decoupled from the schema and avoid serialization cycles.
- **Migrations never run implicitly on app startup.** Schema changes happen only through the explicit init command (section 6), which matches your "don't reset or surprise me" requirement.

## 2. Project structure

```
ShopFlow/
├─ ShopFlow.slnx
├─ src/ShopFlow.Web/
│  ├─ Program.cs                  wiring, config, the `db init` command-line mode
│  ├─ Domain/                     entities + enums (Product, Order, OrderStatus…)
│  ├─ Data/                       ShopFlowDbContext, Configurations/, Migrations/, Seeding/
│  ├─ Services/                   OrderService, InventoryService, DashboardService
│  ├─ Endpoints/                  ProductEndpoints, CustomerEndpoints, OrderEndpoints, …
│  ├─ Dtos/
│  ├─ appsettings.json            no secrets
│  └─ wwwroot/
│     ├─ index.html (dashboard), products.html, customers.html, orders.html, order.html
│     ├─ css/site.css
│     └─ js/api.js (shared fetch helper), plus one module per page
├─ tests/ShopFlow.Tests/          xUnit
├─ scripts/setup.sh, setup.ps1
├─ docs/architecture.md
├─ .gitignore, .gitattributes, README.md
```

**Why a single web project instead of Api/Core/Data class libraries:** folders give you the same separation for a learning-sized app without the project-reference overhead. We can split later if it grows.

## 3. Database design

All tables use an `int` identity primary key. Timestamps are `timestamptz` (UTC) and money is `numeric(12,2)` (`decimal` in C#, never `double`).

| Table | Key columns | Notes |
|---|---|---|
| **Customers** | Id, Name, Email (unique), Phone, IsActive, CreatedAt, UpdatedAt | Deactivate instead of delete |
| **Products** | Id, Sku (unique), Name, Description, UnitPrice, QuantityOnHand, ReorderLevel, IsActive, CreatedAt, UpdatedAt | `CHECK (QuantityOnHand >= 0)`, plus a concurrency token |
| **Orders** | Id, OrderNumber (unique), CustomerId → Customers, Status, OrderDate, Notes, CreatedAt, UpdatedAt | |
| **OrderItems** | Id, OrderId → Orders (cascade), ProductId → Products (restrict), Quantity, UnitPrice | `CHECK (Quantity > 0)`, unique (OrderId, ProductId) |
| **OrderStatusHistory** | Id, OrderId → Orders, FromStatus (nullable), ToStatus, ChangedAt, Note | Append-only |
| **InventoryTransactions** | Id, ProductId → Products, QuantityChange, Reason, OrderId (nullable), CreatedAt | Append-only stock ledger |

Relationships: Customer 1─* Order, Order 1─* OrderItem, Product 1─* OrderItem, Order 1─* StatusHistory, Product 1─* InventoryTransaction.

**Design choices:**
- **`OrderItems.UnitPrice` is a snapshot** of the product price at order time. Otherwise a later price change would silently rewrite historical orders.
- **Order total is computed**, not stored. It can't drift out of sync with the items.
- **Status is stored as text** via an EF value converter. It's readable in `psql` and safe if the enum is reordered.
- **The ledger is my addition.** `QuantityOnHand` is the fast value to read, and the ledger explains how it got there. It also gives us a restock mechanism (see section 9).
- **Products and customers are never hard-deleted**, since order history references them. `IsActive` handles retirement.

## 4. Business rules

**Order lifecycle:**
```
Draft ──► Confirmed ──► Fulfilled (terminal)
  └───────────┴──────► Cancelled (terminal)
```
- **Draft:** items and quantities are freely editable. Prices are snapshotted when an item is added.
- **Confirmed:** the order is locked, with no item edits.
- **Fulfilled:** inventory is decremented. There are no returns or reversals in v1.
- **Cancelled:** allowed only from Draft or Confirmed. It doesn't touch stock, because stock was never taken.
- Every transition is validated against this table and writes an `OrderStatusHistory` row.

**Fulfillment** runs in one database transaction:
1. Verify the order is `Confirmed`.
2. For each item, run an atomic conditional update: `UPDATE Products SET QuantityOnHand = QuantityOnHand - @q WHERE Id = @id AND QuantityOnHand >= @q`. If any update affects 0 rows, roll back everything and return 409 listing the shortfalls.
3. Write ledger rows, set the status to `Fulfilled`, and write the history row.
4. Commit.

**Why this approach:** the conditional update is race-safe, so two simultaneous fulfillments can't oversell, and no read-then-write window exists. It's all-or-nothing, so there are no half-fulfilled orders. The `CHECK` constraint is a second line of defense. Processing items in ProductId order avoids deadlocks.

**No stock reservation in v1.** Confirming doesn't hold stock, and only fulfillment checks it. This matches your requirements and avoids a whole class of complexity.

## 5. API design

JSON under `/api`. Errors use RFC 7807 `ProblemDetails`: 400 validation, 404 not found, 409 conflict or insufficient stock.

```
GET/POST        /api/products            (?search=&activeOnly=&page=&pageSize=)
GET/PUT         /api/products/{id}
POST            /api/products/{id}/deactivate | /activate
POST            /api/products/{id}/adjust-stock    {change, reason}  → ledger row

GET/POST        /api/customers
GET/PUT         /api/customers/{id}
POST            /api/customers/{id}/deactivate | /activate

GET/POST        /api/orders              (?status=&customerId=)   create as Draft
GET             /api/orders/{id}         (items, total, history)
PUT             /api/orders/{id}         notes / customer, Draft only
POST/PUT/DELETE /api/orders/{id}/items[/{itemId}]                 Draft only
POST            /api/orders/{id}/confirm | /fulfill | /cancel
GET             /api/orders/{id}/history

GET             /api/dashboard           counts by status, low-stock list,
                                         inventory value, recent orders
GET             /api/health
```

**Why action endpoints (`/fulfill`) instead of `PUT status=Fulfilled`:** transitions carry side effects and rules, so explicit verbs make that clear and prevent clients from setting arbitrary statuses.

## 6. Database initialization

1. **Prerequisite:** PostgreSQL is running and an empty `shopflow` database exists, plus a login role for it.
2. **Config:** `appsettings.json` has the host, port, database and user, but no password. The password lives in .NET **User Secrets**, which are stored outside the repo in your user profile and work identically on both OSes. Env vars can override it, e.g. `ConnectionStrings__ShopFlow`.
3. **Shared init:** `dotnet run --project src/ShopFlow.Web -- db init` runs `Database.MigrateAsync()`, which applies only pending migrations, then runs the seeder, then exits. Both scripts call this one command, so there is a single code path.
4. **Seeder is code, not EF `HasData`.** `HasData` bakes rows into migrations and works by fixed IDs. Code seeding looks up natural keys (SKU, email, order number) and inserts only what's missing. It never updates or deletes existing rows, so it's idempotent and respects your data.
5. **Seeded orders are inserted directly in a consistent final state.** A fulfilled sample order is written with its history and ledger rows, and product quantities are seeded as already reflecting it. This avoids re-running fulfillment logic, which would double-decrement stock.
6. **Setup scripts (`setup.sh` / `setup.ps1`) do the following:**
   - Check for the .NET 10 SDK, `psql`, and that the server accepts connections (`pg_isready`). If anything is missing, they print OS-specific install instructions and stop. They never install anything.
   - Prompt for the DB password, with input hidden, and store it via `dotnet user-secrets`. Passwords are never passed on command lines or logged.
   - Optionally offer, with an explicit yes/no, to create the role and database if they're missing. If you decline, they print the SQL to run yourself.
   - Run `db init`, then print how to start the app.
   - Re-running either script is safe.
7. **`dotnet-ef` is only needed to create new migrations**, not to set up. Applying migrations at runtime means a cloner doesn't need it.

## 7. Cross-platform considerations

| Issue | Plan |
|---|---|
| **Fedora Postgres defaults** | A fresh install needs `postgresql-setup --initdb`, and `pg_hba.conf` defaults to `ident` auth on TCP, which rejects password logins. This is the most likely first-run failure. The script will detect it and explain the fix. |
| **Windows `psql`** | The EDB installer usually doesn't add `psql` to PATH. The script checks the standard install folders and tells you what to do. |
| **Line endings** | `.gitattributes` forces LF for `*.sh` and `*.sql`. Otherwise `setup.sh` can break after a Windows checkout. |
| **Exec bit** | `setup.sh` needs `chmod +x` committed to Git. |
| **PowerShell execution policy** | Document `powershell -ExecutionPolicy Bypass -File scripts/setup.ps1`. The script doesn't change system policy. |
| **HTTPS dev cert** | Trusting it is easy on Windows (`dotnet dev-certs https --trust`) and unreliable on Linux. Local dev will use plain HTTP on localhost only. |
| **`localhost` resolution** | Use `127.0.0.1` in the connection string to avoid IPv6 `::1` surprises. |
| **File-name case** | Linux paths are case-sensitive, so `wwwroot` references must match exactly. |
| **Switching machines** | Migrations are in Git, so after `git pull` you re-run `db init` to catch up. Data stays per-machine. |

## 8. Implementation milestones

Each one is independently testable and ends with a review stop.

1. **Foundation:** solution skeleton, `docs/architecture.md`, `.gitattributes`, `.gitignore` review, `/api/health`, config and user-secrets wiring.
2. **Data layer:** entities, DbContext, configurations, first migration, and `db init` (migrate only).
3. **Setup scripts and seeding:** both scripts plus the idempotent seeder. Test by running setup twice and verifying row counts don't change.
4. **Products:** API, stock adjustment and ledger, and the products page.
5. **Customers:** API and page.
6. **Orders, part 1:** create a Draft, edit items, price snapshot, and the order pages.
7. **Orders, part 2:** status transitions, fulfillment, history, and tests for insufficient stock and concurrency.
8. **Dashboard.**
9. **Polish:** error handling, README, and a test-coverage review.

**Testing:**
- **Unit tests** cover the pure status-transition rules.
- **Integration tests** run against a real local PostgreSQL test database (`shopflow_test`). I recommend against EF's in-memory or SQLite providers, because they don't enforce constraints or row-locking the way Postgres does, so they'd hide exactly the bugs we care about. Testcontainers is out because it needs Docker.

## 9. Decisions and risks to resolve

**Decisions (my recommendation first):**
1. **Minimal APIs vs controllers.** I recommend minimal APIs, grouped per resource, because there's less boilerplate. Controllers are more common in tutorials, so tell me if you'd rather learn those.
2. **Draft → Confirmed → Fulfilled lifecycle.** Is that the right set of states, or do you want something simpler (Pending → Fulfilled)?
3. **Stock adjustment endpoint and ledger table.** Without them there's no way to add stock after seeding. Include them?
4. **Role and database creation by the setup script, with confirmation,** or manual-only with printed instructions? I recommend the confirmed offer.
5. **Multi-page static frontend** (one HTML file per area, shared JS modules) vs a single-page app with client-side routing. I recommend multi-page, since it's simpler to learn and debug. I'll use `textContent` rather than `innerHTML` for rendering data, to avoid XSS.
6. **No authentication in v1.** The app binds to localhost only and the doc states this limitation. Is that acceptable?

**Risks:**
- **Migration conflicts across machines:** create migrations on one machine at a time, and commit and push before switching. Conflicts in the model snapshot file are painful to merge.
- **Fedora Postgres auth setup** (above) is the most likely onboarding failure, so the script's diagnostics matter.
- **Password handling in scripts:** we must avoid shell history, process lists, and logs. The design above covers this.
- **PostgreSQL version drift** between your machines: I'd document PostgreSQL 16 or newer as the baseline.

Once you've answered section 9 (or told me to go with the recommendations), I'll start Milestone 1, beginning with the list of files I'll create and modify. I'll follow your `CLAUDE.local.md` comment style and won't commit anything.