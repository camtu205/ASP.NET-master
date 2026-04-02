using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace NguyenThiCamTu_2123110472.Models
{
    public class User
    {
        [Key]
        public int Id { get; set; }
        
        [Required]
        [MaxLength(50)]
        public string Username { get; set; } = string.Empty;

        [Required]
        [MaxLength(100)]
        public string PasswordHash { get; set; } = string.Empty;

        [Required]
        [MaxLength(20)]
        public string Role { get; set; } = "Staff"; // Admin, Staff
    }

    public class Customer
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [MaxLength(100)]
        public string FullName { get; set; } = string.Empty;

        [MaxLength(20)]
        public string PhoneNumber { get; set; } = string.Empty;

        [MaxLength(100)]
        public string Email { get; set; } = string.Empty;

        public ICollection<Appointment> Appointments { get; set; } = new List<Appointment>();
        public ICollection<Order> Orders { get; set; } = new List<Order>();
        public ICollection<Review> Reviews { get; set; } = new List<Review>();
    }

    public class Service
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty;

        public string Description { get; set; } = string.Empty;

        [Column(TypeName = "decimal(18,2)")]
        public decimal Price { get; set; }

        public int DurationMinutes { get; set; }

        public int? CategoryId { get; set; }
        [ForeignKey("CategoryId")]
        public ServiceCategory? Category { get; set; }

        public ICollection<AppointmentDetail> AppointmentDetails { get; set; } = new List<AppointmentDetail>();
        public ICollection<Review> Reviews { get; set; } = new List<Review>();
    }

    public class Product
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty;

        public string Description { get; set; } = string.Empty;

        [Column(TypeName = "decimal(18,2)")]
        public decimal Price { get; set; }

        public int StockQuantity { get; set; }

        public ICollection<OrderDetail> OrderDetails { get; set; } = new List<OrderDetail>();
    }

    public class Staff
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [MaxLength(100)]
        public string FullName { get; set; } = string.Empty;

        [MaxLength(20)]
        public string PhoneNumber { get; set; } = string.Empty;

        [MaxLength(100)]
        public string Position { get; set; } = string.Empty; // e.g. Masseur, Hair Stylist

        public ICollection<Appointment> Appointments { get; set; } = new List<Appointment>();
    }

    public class Appointment
    {
        [Key]
        public int Id { get; set; }

        public DateTime AppointmentDate { get; set; }

        [Required]
        [MaxLength(20)]
        public string Status { get; set; } = "Pending"; // Pending, Assigned, Done, Cancelled

        public int CustomerId { get; set; }
        [ForeignKey("CustomerId")]
        public Customer? Customer { get; set; }

        public int? StaffId { get; set; } // Nullable if not assigned yet
        [ForeignKey("StaffId")]
        public Staff? Staff { get; set; }

        public ICollection<AppointmentDetail> AppointmentDetails { get; set; } = new List<AppointmentDetail>();
    }

    public class AppointmentDetail
    {
        [Key]
        public int Id { get; set; }

        public int AppointmentId { get; set; }
        [ForeignKey("AppointmentId")]
        public Appointment? Appointment { get; set; }

        public int ServiceId { get; set; }
        [ForeignKey("ServiceId")]
        public Service? Service { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal PriceAtTime { get; set; }
    }

    public class Order
    {
        [Key]
        public int Id { get; set; }

        public DateTime OrderDate { get; set; } = DateTime.Now;

        [Column(TypeName = "decimal(18,2)")]
        public decimal TotalAmount { get; set; }

        public int CustomerId { get; set; }
        [ForeignKey("CustomerId")]
        public Customer? Customer { get; set; }

        // Mối quan hệ tùy chọn với Appointment: một Order có thể được tạo ra từ một Appointment (checkout sau khi xong)
        public int? AppointmentId { get; set; }
        [ForeignKey("AppointmentId")]
        public Appointment? Appointment { get; set; }

        public int? PromotionId { get; set; }
        [ForeignKey("PromotionId")]
        public Promotion? Promotion { get; set; }

        public ICollection<OrderDetail> OrderDetails { get; set; } = new List<OrderDetail>();
    }

    public class OrderDetail
    {
        [Key]
        public int Id { get; set; }

        public int OrderId { get; set; }
        [ForeignKey("OrderId")]
        public Order? Order { get; set; }

        // Có thể là chi tiết cho Service hoặc Product
        public int? ServiceId { get; set; }
        [ForeignKey("ServiceId")]
        public Service? Service { get; set; }

        public int? ProductId { get; set; }
        [ForeignKey("ProductId")]
        public Product? Product { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal UnitPrice { get; set; }

        public int Quantity { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal SubTotal { get; set; }
    }

    public class ServiceCategory
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty;

        public ICollection<Service> Services { get; set; } = new List<Service>();
    }

    public class Promotion
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty;

        [Column(TypeName = "decimal(5,2)")]
        public decimal DiscountPercent { get; set; }

        public DateTime StartDate { get; set; }
        
        public DateTime EndDate { get; set; }

        public ICollection<Order> Orders { get; set; } = new List<Order>();
    }

    public class Review
    {
        [Key]
        public int Id { get; set; }

        public int CustomerId { get; set; }
        [ForeignKey("CustomerId")]
        public Customer? Customer { get; set; }

        public int ServiceId { get; set; }
        [ForeignKey("ServiceId")]
        public Service? Service { get; set; }

        public int Rating { get; set; } // e.g., 1 to 5

        public string Comment { get; set; } = string.Empty;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
