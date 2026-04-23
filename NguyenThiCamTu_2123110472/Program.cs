using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using NguyenThiCamTu_2123110472.Data;
using NguyenThiCamTu_2123110472.Services;
AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true);

var builder = WebApplication.CreateBuilder(new WebApplicationOptions 
{ 
    Args = args,
    ContentRootPath = Directory.GetCurrentDirectory(),
    WebRootPath = "wwwroot"
});

// Add services to the container.
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ICurrentUserService, CurrentUserService>();
builder.Services.AddScoped<VnPayService>();

// Cấu hình Forwarded Headers để nhận diện đúng HTTPS/IP khi chạy sau Proxy (Render, Vercel)
builder.Services.Configure<Microsoft.AspNetCore.Builder.ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = Microsoft.AspNetCore.HttpOverrides.ForwardedHeaders.XForwardedFor | Microsoft.AspNetCore.HttpOverrides.ForwardedHeaders.XForwardedProto;
    options.KnownNetworks.Clear();
    options.KnownProxies.Clear();
});

builder.Services.AddControllers()
    .AddJsonOptions(options => {
        options.JsonSerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
    });
// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "SpaSalonCRM API", Version = "v1" });

    // Add JWT Authentication to Swagger
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "JWT Authorization header using the Bearer scheme. Example: \"Authorization: Bearer {token}\"",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement()
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                },
                Scheme = "oauth2",
                Name = "Bearer",
                In = ParameterLocation.Header,
            },
            new List<string>()
        }
    });
});

// Configure JWT Authentication
var jwtSettings = builder.Configuration.GetSection("Jwt");
var secretKey = jwtSettings["Key"] ?? "Secret";

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowVercel", builder =>
    {
        builder.WithOrigins("https://*.vercel.app") // Cho phép tất cả subdomains của Vercel
               .SetIsOriginAllowedToAllowWildcardSubdomains()
               .AllowAnyMethod()
               .AllowAnyHeader()
               .AllowCredentials();
    });
    // Giữ lại AllowAll cho dev environment nếu cần
    options.AddPolicy("AllowAll", builder => builder.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader());
});

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.RequireHttpsMetadata = false;
    options.SaveToken = true;
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.ASCII.GetBytes(secretKey)),
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidIssuer = jwtSettings["Issuer"],
        ValidAudience = jwtSettings["Audience"],
        ClockSkew = TimeSpan.Zero
    };
});

// Configure Entity Framework Core with PostgreSQL
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

var app = builder.Build();

// Cấu hình Database ban đầu (đã chuyển sang đoạn Migration bên dưới)


app.UseForwardedHeaders();

// Enable Static Files and Default Files (index.html)
app.UseDefaultFiles();
app.UseStaticFiles();

app.UseCors("AllowAll");

// Configure the HTTP request pipeline.
app.UseSwagger();
app.UseSwaggerUI();

app.UseHttpsRedirection();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

// Handle SPA routing
app.MapFallbackToFile("index.html");

// --- ĐOẠN NÀY THỰC THI MIGRATION VÀO DATABASE ---
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    try
    {
        var context = services.GetRequiredService<AppDbContext>();
        context.Database.Migrate();
        
        // Tự động cập nhật Schema
        Action<string> trySql = (sql) => {
            try { context.Database.ExecuteSqlRaw(sql); } catch { }
        };

        trySql("ALTER TABLE \"Promotions\" ADD COLUMN \"MaxUsage\" INTEGER;");
        trySql("ALTER TABLE \"Promotions\" ADD COLUMN \"ApplicableServiceIds\" TEXT;");
        trySql("ALTER TABLE \"Treatments\" ADD COLUMN \"ServiceIds\" TEXT;");
        trySql("ALTER TABLE \"Customers\" ADD COLUMN \"Username\" TEXT;");
        trySql("ALTER TABLE \"Customers\" ADD COLUMN \"Rank\" TEXT DEFAULT 'Standard';");
        trySql("ALTER TABLE \"Appointments\" ADD COLUMN \"IsPrepaid\" BOOLEAN DEFAULT FALSE;");
        trySql("ALTER TABLE \"Appointments\" ADD COLUMN \"PrepaidAmount\" DECIMAL DEFAULT 0;");
        trySql("ALTER TABLE \"Appointments\" ADD COLUMN \"TotalPrice\" DECIMAL DEFAULT 0;");
        trySql("ALTER TABLE \"Reviews\" ADD COLUMN \"AppointmentId\" INTEGER;");
        trySql("ALTER TABLE \"Reviews\" ALTER COLUMN \"ServiceId\" DROP NOT NULL;");
        trySql("ALTER TABLE \"Users\" ADD COLUMN \"FullName\" TEXT;");
        trySql("ALTER TABLE \"Users\" ADD COLUMN \"PhoneNumber\" TEXT;");
        trySql("ALTER TABLE \"Users\" ADD COLUMN \"Email\" TEXT;");
        trySql("ALTER TABLE \"Users\" ADD COLUMN \"Address\" TEXT;");
        
        // Cố gắng chạy bản có IF NOT EXISTS nếu Postgres
        trySql("ALTER TABLE \"Promotions\" ADD COLUMN IF NOT EXISTS \"MaxUsage\" INTEGER;");
        trySql("ALTER TABLE \"Appointments\" ADD COLUMN IF NOT EXISTS \"IsPrepaid\" BOOLEAN DEFAULT FALSE;");
        trySql("ALTER TABLE \"Appointments\" ADD COLUMN IF NOT EXISTS \"PrepaidAmount\" DECIMAL DEFAULT 0;");
        trySql("ALTER TABLE \"Reviews\" ADD COLUMN IF NOT EXISTS \"AppointmentId\" INTEGER;");
        trySql(@"CREATE TABLE IF NOT EXISTS ""Notifications"" (
            ""Id"" SERIAL PRIMARY KEY,
            ""Title"" VARCHAR(200) NOT NULL,
            ""Message"" TEXT NOT NULL,
            ""CreatedDate"" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            ""IsRead"" BOOLEAN DEFAULT FALSE,
            ""UserId"" INTEGER NOT NULL
        );");



        app.Logger.LogInformation(">>> DATABASE MIGRATION SUCCESSFUL! <<<");
    }
    catch (Exception ex)
    {
        app.Logger.LogError(ex, ">>> DATABASE MIGRATION FAILED! <<<");
    }
}
// -----------------------------------------------

app.Run();
