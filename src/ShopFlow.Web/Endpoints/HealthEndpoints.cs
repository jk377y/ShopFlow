namespace ShopFlow.Web.Endpoints;

public static class HealthEndpoints
{
    public static void MapHealthEndpoints(this IEndpointRouteBuilder app)
    {
        // Simple "is the app up?" check. It doesn't touch the database yet; that comes in Milestone 2.
        app.MapGet("/api/health", () => Results.Ok(new { status = "ok" }));
    }
}
