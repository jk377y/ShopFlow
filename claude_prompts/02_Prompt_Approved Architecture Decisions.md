# ShopFlow — Approved Architecture Decisions

I've reviewed your architecture proposal and approved all six decisions, with a few additional requirements.

## Approved Decisions

**1. API Architecture — Minimal APIs**

Use ASP.NET Core Minimal APIs with separate endpoint files and services for business logic.

Keep endpoints focused on HTTP requests and responses. Business rules should remain separate from the API layer.

**2. Order Lifecycle**

Use the following order states:

Draft → Confirmed → Fulfilled

Orders may also be cancelled from Draft or Confirmed.

- Draft orders can be edited.
- Confirmed orders are locked.
- Inventory decreases only when an order is fulfilled.
- Cancelled orders do not affect inventory.
- Fulfilled and Cancelled are terminal states.
- Record order status changes in the OrderStatusHistory table.

Stock is not reserved when an order is confirmed.

**3. Inventory Management**

Include an InventoryTransactions table and stock-adjustment functionality.

- Record inventory increases and decreases.
- Require a reason for manual stock adjustments.
- Prevent inventory quantities from becoming negative.
- Record inventory changes caused by order fulfillment.
- Ensure inventory adjustments and fulfillment are handled safely using database transactions.

**4. Database Initialization**

Use assisted PostgreSQL setup with explicit user confirmation.

- Provide separate setup scripts for Fedora/Linux and Windows PowerShell.
- Use a dedicated ShopFlow database and PostgreSQL role.
- Prompt the developer to create a password during first-time setup.
- Hide password input and require confirmation.
- Store application credentials locally using .NET User Secrets.
- Never display, log, or commit passwords.
- Never silently modify existing database credentials or overwrite existing data.
- Provide manual setup instructions when automated database creation is unavailable.
- Use shared .NET initialization logic for migrations and idempotent sample-data seeding.

The setup process must be safe to run multiple times.

**5. Frontend Architecture**

Use a multi-page frontend built with HTML, CSS, and vanilla JavaScript.

- Serve the pages directly through ASP.NET Core.
- Use shared styles and JavaScript utilities.
- Avoid frontend frameworks and unnecessary build tooling.
- Keep the interface simple, clean, and responsive.

**6. Authentication**

Do not implement application authentication in version 1.

- Bind the application to localhost.
- Keep database credentials secure.
- Validate requests on the backend.
- Document that the application is intended for local development and is not production-ready.

Database authentication is still required.

## Additional Requirement — Setup Documentation

Provide clear, beginner-friendly setup instructions for both Fedora Linux and Windows 11.

The documentation should explain:

- Required software and prerequisites.
- How to execute the appropriate setup script.
- How database credentials are configured.
- What the setup process does.
- How to verify successful initialization.
- How to start and stop the application.
- How to rerun setup safely.
- Common PostgreSQL connection and authentication problems.

Use README.md for the basic getting-started instructions. Create docs/setup.md if more detailed instructions are necessary.

## Architecture Documentation

Once implementation is authorized, create docs/architecture.md to record our approved architecture and important engineering decisions.

Keep this document synchronized with meaningful architectural changes.

It should serve as a reference when switching between Fedora and Windows or starting a new Claude Code session.

## Next Step — Finalize Planning

Please incorporate these decisions into your proposed architecture.

Before beginning implementation:

1. Identify any remaining contradictions or unresolved architectural issues.
2. Provide a concise summary of the finalized architecture.
3. Present the scope of Milestone 1, including the files you intend to create or modify.
4. Explain how we will verify that Milestone 1 was completed successfully.

Do not create files, install software, modify the environment, or write application code yet.

Wait for my approval before beginning Milestone 1.

Do not commit or push changes to GitHub.