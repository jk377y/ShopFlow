Nothing has been created or changed. I only checked the repo and your tooling, and found one blocker, described next.

## Blocker: .NET isn't installed on this Fedora machine

`dotnet`, `psql` and `pg_isready` are all missing. Milestone 1 can't be built or verified without the .NET 10 SDK, so you'll need to install it before I start. PostgreSQL isn't needed until Milestone 2. I won't install either one, as you asked. On Fedora the SDK is normally `sudo dnf install dotnet-sdk-10.0`, and `dotnet --list-sdks` should then show a `10.x` entry.

## 1. Remaining contradictions and gaps

I fixed each of these in the finalized design in section 2, except the two that are your call (items 8 and 9).

1. **Stock quantity could drift from the ledger.** You approved both a `QuantityOnHand` column and an `InventoryTransactions` table. Left alone, `PUT /products/{id}` or the seeder could change the quantity with no ledger row.
   - **Rule:** `QuantityOnHand` always equals the sum of that product's ledger rows.
   - **Enforcement:** only `InventoryService` changes quantity, and the product update DTO has no quantity field.
   - **Initial and seeded stock:** creating a product with starting stock, and seeding, both write an "Initial stock" ledger row.
2. **Documentation vs. delivery order.** The setup docs you want depend on scripts that arrive in Milestone 3, and `architecture.md` has to match the actual implementation.
   - **README:** it grows with each milestone and only documents what exists.
   - **`docs/setup.md`:** created in Milestone 3, together with the scripts.
3. **Creating the role needs PostgreSQL superuser access.** The role-creation step runs as an administrator, so I'll let it use sudo on Fedora and the `postgres` password on Windows, each after your explicit confirmation.
   - **Where the app password goes:** it never appears on a command line or in logs. I'll set it through an interactive `psql` password prompt or stdin, and store it in User Secrets.
   - **Reusing the role:** an existing `shopflow` role is reused and its password is never changed.
4. **Integration tests need their own database** (`shopflow_test`). I'll have the setup script offer to create it too, with the same confirmation, and the test project will read the same User Secrets. This lands in Milestone 3, after the role exists.
5. **Inactive products and customers in orders.**
   - **Draft orders:** inactive products can't be added, and inactive customers can't be chosen.
   - **Already-confirmed orders:** these can still be fulfilled, because deactivating a product shouldn't strand an order. Tell me if you'd rather block fulfillment.
6. **Order creation history.** The first history row has no "from" status (null → Draft).
7. **"Bind to localhost" must be enforced in config.** I'll set Kestrel to `http://127.0.0.1:5080` and restrict allowed hosts to `localhost` and `127.0.0.1`. The port is overridable by environment variable.
8. **`claude_prompts/` is a new, untracked folder.** Whether to commit it or add it to `.gitignore` is your decision. I'll leave it alone.
9. **`CLAUDE.local.md` is already git-ignored.** No change needed.

## 2. Finalized architecture summary

- **Runtime:** one ASP.NET Core (.NET 10) app. It serves static pages from `wwwroot` and a JSON API under `/api`, on `127.0.0.1` only, with no authentication in v1. Same origin means no CORS.
- **Layers:**
  - **Minimal API endpoint files** handle HTTP only.
  - **Services** (`OrderService`, `InventoryService`, `DashboardService`) hold the business rules.
  - **EF Core + Npgsql** handles data access.
  - The API returns DTOs, never entities.
- **Frontend:** multi-page vanilla HTML/CSS/JS with a shared `site.css` and a shared `api.js`. It has no framework and no build step, and it renders data with `textContent`.
- **Data:** six tables (Customers, Products, Orders, OrderItems, OrderStatusHistory, InventoryTransactions) with the schema from my first proposal. Prices are snapshotted on order items, totals are computed, and nothing is hard-deleted.
- **Order lifecycle:** Draft → Confirmed → Fulfilled, plus Cancelled from Draft or Confirmed.
  - **Terminal states:** Fulfilled and Cancelled.
  - **Locking:** Confirmed orders are locked.
  - **History:** every transition writes a history row.
  - **Stock:** there is no reservation, and stock only changes at fulfillment.
- **Inventory:** every change goes through `InventoryService` inside a transaction.
  - **Safety check:** an atomic `UPDATE … WHERE QuantityOnHand >= @q`, backed by a `CHECK >= 0` constraint.
  - **Ledger:** each change writes a ledger row.
  - **Manual adjustments:** these require a reason.
  - **Fulfillment:** it is all-or-nothing and returns 409 with the shortfalls if anything is short.
- **Initialization:** `dotnet run --project src/ShopFlow.Web -- db init` applies pending migrations and then runs the idempotent natural-key seeder. Migrations never run on normal startup. Setup scripts wrap this command.
- **Credentials:** host, port, database and user live in `appsettings.json`. The password lives only in User Secrets, with an env-var override.
- **Tests:** xUnit. Unit tests cover the status rules, and integration tests run against a real local PostgreSQL. There is no in-memory provider and no Docker.
- **Docs:** `README.md` for quick start, `docs/setup.md` for details (Milestone 3), and `docs/architecture.md` kept in sync.

## 3. Milestone 1 scope: Foundation

The goal is a running, tested skeleton with no database yet. EF Core and Npgsql arrive in Milestone 2.

**Files to create:**

| File | Purpose |
|---|---|
| `global.json` | Pins the .NET 10 SDK band so both machines build the same way |
| `ShopFlow.slnx` | Solution file (the .NET 10 default format) |
| `src/ShopFlow.Web/ShopFlow.Web.csproj` | Web project, with a `UserSecretsId` for later |
| `src/ShopFlow.Web/Program.cs` | App wiring: static files, endpoint registration, localhost binding |
| `src/ShopFlow.Web/Endpoints/HealthEndpoints.cs` | `GET /api/health` returns `{ "status": "ok" }`, with no database check yet |
| `src/ShopFlow.Web/appsettings.json` | Kestrel URL `http://127.0.0.1:5080`, `AllowedHosts`, logging, and no secrets |
| `src/ShopFlow.Web/wwwroot/index.html` | Placeholder page using `css/site.css` and `js/api.js` |
| `src/ShopFlow.Web/wwwroot/css/site.css`, `js/api.js` | Minimal shared stylesheet and fetch helper. The placeholder page calls the health endpoint through the helper to prove the wiring. |
| `tests/ShopFlow.Tests/ShopFlow.Tests.csproj` | xUnit project referencing the web project, plus the `Microsoft.AspNetCore.Mvc.Testing` package |
| `tests/ShopFlow.Tests/HealthEndpointTests.cs` | Health endpoint returns 200 and the expected JSON; the home page is served |
| `.gitattributes` | LF for `*.sh` and `*.sql`, and sensible defaults for the rest |
| `docs/architecture.md` | The finalized architecture above, written as a reference document |
| `README.md` | Overview, the local-only/not-production disclaimer, prerequisites (.NET 10 SDK), and how to run and test the skeleton. No database steps yet. |

**File to modify:** `.gitignore`. I'll add `.vs/`, `TestResults/` and `*.user`, and fix the missing trailing newline. Nothing existing is removed.

**Explicitly out of scope:** EF Core, Npgsql, entities, migrations, setup scripts, `docs/setup.md`, and any real pages or API resources.

**Packages:** the only external dependency is `Microsoft.AspNetCore.Mvc.Testing` plus the xUnit test packages, all in the test project. The web project itself uses only the built-in framework.

I'll use `dotnet new` for scaffolding and then trim the template output. I'll follow your `CLAUDE.local.md` comment style, and I won't commit or push anything.

## 4. How we verify Milestone 1

1. `dotnet build ShopFlow.slnx` finishes with 0 errors and 0 warnings.
2. `dotnet test` passes, covering the health endpoint and the home page.
3. `dotnet run --project src/ShopFlow.Web` starts the app, and:
   - `curl http://127.0.0.1:5080/api/health` returns 200 with `{"status":"ok"}`.
   - `curl http://127.0.0.1:5080/` returns the placeholder HTML.
   - In a browser, the placeholder page shows the health result fetched through `api.js`.
   - `ss -ltn | grep 5080` shows the listener on `127.0.0.1` only, not `0.0.0.0`.
   - A request with a bad `Host` header is rejected.
4. `git status` shows only the expected new files, no `bin/` or `obj/`, and no commits made.
5. Cross-platform check by you on Windows after you commit and pull: `dotnet build` and `dotnet test` pass there too. I can't test Windows myself.
6. You review `docs/architecture.md` and `README.md` against the code for accuracy.

## Needed from you

1. Install the .NET 10 SDK on Fedora.
2. Approve the Milestone 1 scope above, or tell me what to change.
3. Answer the two open items: whether fulfillment of a confirmed order should still work after one of its products is deactivated (my recommendation is yes), and what to do with `claude_prompts/`.