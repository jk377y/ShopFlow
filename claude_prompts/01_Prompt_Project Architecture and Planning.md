# ShopFlow — Project Architecture and Planning

I want to build **ShopFlow**, a small full-stack manufacturing inventory and order management application.

This project serves two purposes:

1. Learn C#/.NET, SQL databases, and full-stack application development.
2. Gain hands-on experience using Claude Code as an AI-assisted software development tool.

I want to understand the engineering decisions behind the application, not simply generate working code.

## Technology Stack

Use the following technologies:

- **Backend:** C# with ASP.NET Core (.NET 10)
- **Database:** PostgreSQL
- **ORM:** Entity Framework Core
- **Frontend:** HTML, CSS, and vanilla JavaScript
- **Development environment:** VS Code
- **Source control:** Git and GitHub

Avoid unnecessary frameworks, dependencies, and services.

Docker is not required for this project. PostgreSQL will run locally on each developer's machine.

## Application Requirements

ShopFlow should provide basic manufacturing inventory and order management functionality.

Core features:

1. Create, view, update, and manage products.
2. Manage customer records.
3. Create orders containing multiple products.
4. Track order status and history.
5. Reduce inventory when orders are fulfilled.
6. Prevent fulfillment when inventory is insufficient.
7. Display a simple dashboard summarizing inventory and order information.

Keep the initial application small and manageable. This is a learning project, not a production ERP system.

## Cross-Platform Requirements

The application must support local development on:

- Fedora Linux
- Windows 11

I will be switching between these operating systems during development.

Both machines will use the same GitHub repository but maintain their own local PostgreSQL databases.

The application must not depend on operating-system-specific paths or tools unless those dependencies are isolated in the setup process.

## Database Initialization and Sample Data

I want another developer to be able to clone the repository and reproduce the application locally.

Please design a first-time setup process that includes:

- `scripts/setup.sh` for Fedora/Linux.
- `scripts/setup.ps1` for Windows PowerShell.
- A shared .NET-based database initialization process.
- Entity Framework Core migrations for creating and updating database tables.
- Fictional sample data for customers, products, and orders.
- Idempotent seeding that does not create duplicate records when executed multiple times.

The setup scripts should check for required software and provide instructions if something is missing.

Avoid automatically installing system-level software or modifying operating-system settings without explicit permission.

Do not overwrite existing database records or reset databases automatically.

Keep database passwords and machine-specific configuration out of Git.

## Development Workflow

I want to develop this application incrementally.

For each implementation phase:

1. Explain the intended changes.
2. Identify which files will be created or modified.
3. Implement only the approved work.
4. Explain important code and architectural decisions.
5. Recommend appropriate tests.
6. Allow me to review the changes before proceeding.

Follow any applicable project instructions, including my personal `CLAUDE.local.md` file.

Do not automatically commit or push changes to GitHub. I will control Git operations.

## Architecture Documentation

Maintain a version-controlled `docs/architecture.md` file that documents the application's agreed-upon architecture and important engineering decisions.

The document should include:

1. Overall application architecture and component responsibilities.
2. Technology choices and the reasoning behind them.
3. Database schema and relationships.
4. Important business rules, particularly inventory management and order fulfillment.
5. Database initialization and cross-platform setup strategy.
6. Significant design decisions, tradeoffs, and limitations.

Keep the documentation concise, understandable, and consistent with the actual implementation.

Update `docs/architecture.md` whenever an approved architectural change is implemented.

This document will also serve as a reference when switching development computers or starting new Claude Code sessions.

**Do not create the file during this initial planning phase.** First propose the architecture and wait for my approval. Once approved, creating `docs/architecture.md` should be part of the first implementation milestone.

## Your Current Task — Planning Only

Before implementing anything, please propose:

1. **Application architecture:** How the frontend, ASP.NET Core backend, and PostgreSQL database will communicate.
2. **Project structure:** Recommended folders and files.
3. **Database design:** Tables, fields, primary keys, foreign keys, and relationships.
4. **Business rules:** How orders, inventory changes, and fulfillment should work.
5. **API design:** Recommended REST endpoints.
6. **Database initialization:** How migrations, sample-data seeding, and the two setup scripts should work together.
7. **Cross-platform considerations:** Any differences we should anticipate between Fedora and Windows.
8. **Implementation milestones:** A logical sequence of small, independently testable development phases.

Identify any important architectural decisions or risks we should resolve before implementation.

For each major recommendation, briefly explain why you've chosen that approach.

**Do not create or modify files, install dependencies, initialize the database, or write application code yet.**

This is strictly a planning exercise. Wait for my approval before implementation.