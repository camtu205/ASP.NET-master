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

        public static async Task CreateNotification(AppDbContext context, string title, string message, int? userId = null, string? targetType = null, int? targetId = null)
        {
            var notification = new Notification
            {
                Title = title,
                Message = message,
                UserId = userId ?? 1, // Default to admin
                TargetType = targetType,
                TargetId = targetId,
                CreatedDate = DateTime.UtcNow,
                IsRead = false
            };
            context.Notifications.Add(notification);
            await context.SaveChangesAsync();
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
        public DbSet<Payment> Payments { get; set; }
        public DbSet<WorkSchedule> WorkSchedules { get; set; }
        public DbSet<ServiceImage> ServiceImages { get; set; }
        public DbSet<LoyaltyPoint> LoyaltyPoints { get; set; }
        public DbSet<Notification> Notifications { get; set; }
        public DbSet<Treatment> Treatments { get; set; }
        public DbSet<CustomerTreatment> CustomerTreatments { get; set; }
        public DbSet<TreatmentSession> TreatmentSessions { get; set; }
        public DbSet<RoomType> RoomTypes { get; set; }
        public DbSet<Room> Rooms { get; set; }
        public DbSet<Bed> Beds { get; set; }
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

            modelBuilder.Entity<Payment>()
                .HasOne(p => p.Order)
                .WithMany(o => o.Payments)
                .HasForeignKey(p => p.OrderId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<WorkSchedule>()
                .HasOne(ws => ws.Staff)
                .WithMany(s => s.WorkSchedules)
                .HasForeignKey(ws => ws.StaffId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<ServiceImage>()
                .HasOne(si => si.Service)
                .WithMany(s => s.ServiceImages)
                .HasForeignKey(si => si.ServiceId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<LoyaltyPoint>()
                .HasOne(lp => lp.Customer)
                .WithOne(c => c.LoyaltyPoint)
                .HasForeignKey<LoyaltyPoint>(lp => lp.CustomerId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Notification>()
                .HasOne(n => n.User)
                .WithMany(u => u.Notifications)
                .HasForeignKey(n => n.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<CustomerTreatment>()
                .HasOne(ct => ct.Customer)
                .WithMany(c => c.CustomerTreatments)
                .HasForeignKey(ct => ct.CustomerId);

            modelBuilder.Entity<CustomerTreatment>()
                .HasOne(ct => ct.Treatment)
                .WithMany(t => t.CustomerTreatments)
                .HasForeignKey(ct => ct.TreatmentId);

            modelBuilder.Entity<TreatmentSession>()
                .HasOne(ts => ts.CustomerTreatment)
                .WithMany(ct => ct.TreatmentSessions)
                .HasForeignKey(ts => ts.CustomerTreatmentId);

            modelBuilder.Entity<TreatmentSession>()
                .HasOne(ts => ts.Staff)
                .WithMany(s => s.TreatmentSessions)
                .HasForeignKey(ts => ts.StaffId);

            modelBuilder.Entity<Room>()
                .HasOne(r => r.RoomType)
                .WithMany(rt => rt.Rooms)
                .HasForeignKey(r => r.RoomTypeId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Bed>()
                .HasOne(b => b.Room)
                .WithMany(r => r.Beds)
                .HasForeignKey(b => b.RoomId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Appointment>()
                .HasOne(a => a.Bed)
                .WithMany(b => b.Appointments)
                .HasForeignKey(a => a.BedId)
                .OnDelete(DeleteBehavior.SetNull);

            modelBuilder.Entity<User>().HasData(
                new User { Id = 1, Username = "admin", PasswordHash = "admin", Role = "Admin" }
            );
        }
    }
}

