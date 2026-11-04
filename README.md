# ShopFlow

A small full-stack manufacturing inventory and order management app. It's a learning project for C#/.NET, SQL databases, and full-stack development, built with ASP.NET Core (.NET 10), PostgreSQL, Entity Framework Core, and plain HTML/CSS/JavaScript.

> **Local development only.** ShopFlow has no user authentication and listens on `127.0.0.1` only. It is not production-ready.

## Current status

Milestone 1 (foundation) is done: a running skeleton with a health endpoint, a placeholder home page, and tests. There is **no database yet**, so you don't need PostgreSQL to run it. Database setup, sample data, and the setup scripts arrive in later milestones, and this README grows as they land.

For the design and the reasoning behind it, see [docs/architecture.md](docs/architecture.md).

## Prerequisites

- [.NET 10 SDK](https://dotnet.microsoft.com/download/dotnet/10.0). Check with `dotnet --list-sdks`; you should see a `10.x` entry.
  - Fedora: `sudo dnf install dotnet-sdk-10.0`
  - Windows 11: `winget install Microsoft.DotNet.SDK.10`
- Git

## Run the app

From the repository root:

```
dotnet run --project src/ShopFlow.Web
```

Then open <http://127.0.0.1:5080>. The page should show `API status: ok`. Stop the app with `Ctrl+C` in the terminal.

You can also check the API directly: <http://127.0.0.1:5080/api/health> returns `{"status":"ok"}`.

## Run the tests

```
dotnet test
```

## Project layout

```
src/ShopFlow.Web/     the web app (API endpoints + static frontend in wwwroot)
tests/ShopFlow.Tests/ automated tests
docs/                 architecture notes
claude_prompts/       the prompts and responses from the AI-assisted planning sessions
```
