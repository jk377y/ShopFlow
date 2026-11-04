using ShopFlow.Web.Endpoints;

var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

// Serve the frontend pages from wwwroot (index.html is the default page).
app.UseDefaultFiles();
app.UseStaticFiles();

// Each resource registers its own routes in its own file, so Program.cs stays short.
app.MapHealthEndpoints();

app.Run();

// Makes Program visible to the test project so it can start the app in memory.
public partial class Program;
