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
        
        // Tự động cập nhật Schema cho bảng Promotions nếu thiếu cột
        try {
            context.Database.ExecuteSqlRaw("ALTER TABLE \"Promotions\" ADD COLUMN IF NOT EXISTS \"MaxUsage\" INTEGER;");
            context.Database.ExecuteSqlRaw("ALTER TABLE \"Promotions\" ADD COLUMN IF NOT EXISTS \"ApplicableServiceIds\" TEXT;");
            context.Database.ExecuteSqlRaw("ALTER TABLE \"Treatments\" ADD COLUMN IF NOT EXISTS \"ServiceIds\" TEXT;");
            context.Database.ExecuteSqlRaw("ALTER TABLE \"Customers\" ADD COLUMN IF NOT EXISTS \"Username\" TEXT;");
            
            // Vá bảng Reviews (Thêm AppointmentId và cho phép ServiceId null)
            context.Database.ExecuteSqlRaw("ALTER TABLE \"Reviews\" ADD COLUMN IF NOT EXISTS \"AppointmentId\" INTEGER;");
            context.Database.ExecuteSqlRaw("ALTER TABLE \"Reviews\" ALTER COLUMN \"ServiceId\" DROP NOT NULL;");

            // Vá bảng Users
            context.Database.ExecuteSqlRaw("ALTER TABLE \"Users\" ADD COLUMN IF NOT EXISTS \"FullName\" TEXT;");
            context.Database.ExecuteSqlRaw("ALTER TABLE \"Users\" ADD COLUMN IF NOT EXISTS \"PhoneNumber\" TEXT;");
            context.Database.ExecuteSqlRaw("ALTER TABLE \"Users\" ADD COLUMN IF NOT EXISTS \"Email\" TEXT;");
            context.Database.ExecuteSqlRaw("ALTER TABLE \"Users\" ADD COLUMN IF NOT EXISTS \"Address\" TEXT;");
        } catch { /* Bỏ qua nếu đã có hoặc lỗi syntax (DB khác Postgres) */ }

        app.Logger.LogInformation(">>> DATABASE MIGRATION SUCCESSFUL! <<<");
    }
    catch (Exception ex)
    {
        app.Logger.LogError(ex, ">>> DATABASE MIGRATION FAILED! <<<");
    }
}
// -----------------------------------------------

app.Run();
