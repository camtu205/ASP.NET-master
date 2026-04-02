using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using NguyenThiCamTu_2123110472.Models;
using NguyenThiCamTu_2123110472.Services;

namespace NguyenThiCamTu_2123110472.Data
{
    public class AppDbContext : DbContext
    {
        private readonly ICurrentUserService _currentUserService;

        public AppDbContext(DbContextOptions<AppDbContext> options, ICurrentUserService currentUserService) : base(options)
        {
            _currentUserService = currentUserService;
        }

        public DbSet<User> Users { get; set; }
        public DbSet<Customer> Customers { get; set; }
        public DbSet<Service> Services { get; set; }
        public DbSet<Product> Products { get; set; }
        public DbSet<Staff> Staffs { get; set; }
        public DbSet<Appointment> Appointments { get; set; }
        public DbSet<AppointmentDetail> AppointmentDetails { get; set; }
        public DbSet<Order> Orders { get; set; }
        public DbSet<OrderDetail> OrderDetails { get; set; }
        public DbSet<AuditLog> AuditLogs { get; set; }
        public DbSet<ServiceCategory> ServiceCategories { get; set; }
        public DbSet<Promotion> Promotions { get; set; }
        public DbSet<Review> Reviews { get; set; }

        public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = new CancellationToken())
        {
            var auditEntries = new List<AuditLog>();
            var entries = ChangeTracker.Entries().Where(e => e.Entity is not AuditLog && (e.State == EntityState.Added || e.State == EntityState.Modified || e.State == EntityState.Deleted)).ToList();

            foreach (var entry in entries)
            {
                var auditEntry = new AuditLog
                {
                    TableName = entry.Entity.GetType().Name,
                    UserId = _currentUserService.UserId ?? "Unknown",
                    Timestamp = DateTime.UtcNow
                };

                switch (entry.State)
                {
                    case EntityState.Added:
                        auditEntry.Action = "Create";
                        auditEntry.NewValues = JsonSerializer.Serialize(entry.CurrentValues.ToObject());
                        break;
                    case EntityState.Deleted:
                        auditEntry.Action = "Delete";
                        auditEntry.OldValues = JsonSerializer.Serialize(entry.OriginalValues.ToObject());
                        break;
                    case EntityState.Modified:
                        if (entry.Properties.Any(p => p.IsModified))
                        {
                            auditEntry.Action = "Update";
                            auditEntry.OldValues = JsonSerializer.Serialize(entry.GetDatabaseValues()?.ToObject() ?? entry.OriginalValues.ToObject());
                            auditEntry.NewValues = JsonSerializer.Serialize(entry.CurrentValues.ToObject());
                        }
                        break;
                }

                if (!string.IsNullOrEmpty(auditEntry.Action))
                {
                    auditEntries.Add(auditEntry);
                }
            }

            if (auditEntries.Any())
            {
                AuditLogs.AddRange(auditEntries);
            }

            return await base.SaveChangesAsync(cancellationToken);
        }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);
            
            modelBuilder.Entity<AppointmentDetail>()
                .HasOne(ad => ad.Appointment)
                .WithMany(a => a.AppointmentDetails)
                .HasForeignKey(ad => ad.AppointmentId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<OrderDetail>()
                .HasOne(od => od.Order)
                .WithMany(o => o.OrderDetails)
                .HasForeignKey(od => od.OrderId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<User>().HasData(
                new User { Id = 1, Username = "admin", PasswordHash = "admin", Role = "Admin" }
            );
        }
    }
}

