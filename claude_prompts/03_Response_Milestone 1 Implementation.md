Milestone 1 is finished and I've stopped for your review. I haven't committed or pushed anything. Everything is untracked: `claude_prompts/` is already tracked-ready, and `bin/` and `obj/` are properly ignored.

## What I built

- **Project skeleton:** `ShopFlow.slnx` and `global.json`, which pins the .NET 10 SDK band so both machines build the same way.
- **Web project:** [src/ShopFlow.Web/](src/ShopFlow.Web/) with a short [Program.cs](src/ShopFlow.Web/Program.cs) and a `/api/health` endpoint in [HealthEndpoints.cs](src/ShopFlow.Web/Endpoints/HealthEndpoints.cs). Each resource registers its routes in its own file.
- **Localhost-only settings:** [appsettings.json](src/ShopFlow.Web/appsettings.json) binds to `127.0.0.1:5080` and allows only the `localhost` and `127.0.0.1` Host headers.
- **Frontend:** a placeholder page in [wwwroot/](src/ShopFlow.Web/wwwroot/) with a shared `site.css` and `api.js` fetch helper. It writes server text with `textContent`.
- **Tests:** three tests in [HealthEndpointTests.cs](tests/ShopFlow.Tests/HealthEndpointTests.cs) that cover the health endpoint, the home page, and rejection of a bad Host header.
- **Housekeeping:** [.gitattributes](.gitattributes) (LF for `*.sh` and `*.sql`, CRLF for `*.ps1`), and `.gitignore` additions for `.vs/`, `TestResults/` and `*.user`.
- **Docs:** [README.md](README.md) and [docs/architecture.md](docs/architecture.md). The architecture doc marks everything not built yet as *(planned)*, so it matches the code.

## Verification results

| Check | Result |
|---|---|
| `dotnet build` | 0 errors, 0 warnings |
| `dotnet test` | 3 of 3 passed |
| `GET /api/health` | 200, `{"status":"ok"}` |
| `GET /` | 200, `text/html` |
| `/js/api.js` and `/css/site.css` | 200 both |
| Bad Host header | 400 |
| Listener | `127.0.0.1:5080` only, not `0.0.0.0` |
| App stopped afterward | Port 5080 free |
| Git | Only the expected new files; no commits |

I didn't open the page in a browser, so the visible `API status: ok` text is untested. Please try it when you review. Windows verification is deferred, as you decided.

## Things to know

- **Deviations from the plan:**
  - I deleted the template's `launchSettings.json` and `appsettings.Development.json`. The launch profile would have overridden the localhost-only binding with its own ports.
  - Because of that, `dotnet run` uses the Production environment by default. That's harmless for now.
  - I added `home.js` as a separate module for the placeholder page, which wasn't in my file list.
- **First-run side effect:** the first `dotnet` command on this machine generated an ASP.NET HTTPS dev certificate in your user profile. It is untrusted, unused, and outside the repo, and the app uses plain HTTP.
- **Packages:** the web project has no external packages. The test project uses the template's xUnit packages plus `Microsoft.AspNetCore.Mvc.Testing`.
- **Pinned versions:** `global.json` pins `10.0.100` with `latestFeature` roll-forward. Your installed SDK is 10.0.113, which satisfies that.
- **Comment style:** I followed your `CLAUDE.local.md` guidance and kept comments short, with only section headers in the CSS.

When you're happy with this, I'll plan Milestone 2 (data layer) and wait for your approval before starting it.