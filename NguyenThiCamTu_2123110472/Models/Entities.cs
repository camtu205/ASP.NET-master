using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

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
        public string Role { get; set; } = "Staff"; // Admin, Staff, Customer

        [MaxLength(100)]
        public string? FullName { get; set; }

        [MaxLength(20)]
        public string? PhoneNumber { get; set; }

        [MaxLength(100)]
        public string? Email { get; set; }

        [MaxLength(200)]
        public string? Address { get; set; }

        public ICollection<Notification> Notifications { get; set; } = new List<Notification>();
    }

    public class Customer
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [MaxLength(100)]
        public string FullName { get; set; } = string.Empty;

        [Required]
        [MaxLength(20)]
        [RegularExpression(@"^0\d{9}$", ErrorMessage = "Số điện thoại phải bắt đầu bằng số 0 và có đúng 10 chữ số.")]
        public string PhoneNumber { get; set; } = string.Empty;

        [MaxLength(100)]
        [EmailAddress(ErrorMessage = "Địa chỉ Email không hợp lệ.")]
        public string Email { get; set; } = string.Empty;

        [MaxLength(50)]
        public string? Username { get; set; }

        [JsonIgnore]
        public ICollection<Appointment> Appointments { get; set; } = new List<Appointment>();
        [JsonIgnore]
        public ICollection<Order> Orders { get; set; } = new List<Order>();
        [JsonIgnore]
        public ICollection<Review> Reviews { get; set; } = new List<Review>();
        [JsonIgnore]
        public ICollection<CustomerTreatment> CustomerTreatments { get; set; } = new List<CustomerTreatment>();
        public LoyaltyPoint? LoyaltyPoint { get; set; }
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
        [Range(0, double.MaxValue, ErrorMessage = "Giá dịch vụ không được nhỏ hơn 0.")]
        public decimal Price { get; set; }

        [Range(1, int.MaxValue, ErrorMessage = "Thời gian phải lớn hơn 0.")]
        public int DurationMinutes { get; set; }

        public int? CategoryId { get; set; }
        [ForeignKey("CategoryId")]
        public ServiceCategory? Category { get; set; }

        [JsonIgnore]
        public ICollection<AppointmentDetail> AppointmentDetails { get; set; } = new List<AppointmentDetail>();
        [JsonIgnore]
        public ICollection<Review> Reviews { get; set; } = new List<Review>();
        [JsonIgnore]
        public ICollection<ServiceImage> ServiceImages { get; set; } = new List<ServiceImage>();
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
        [Range(0, double.MaxValue, ErrorMessage = "Giá sản phẩm không được nhỏ hơn 0.")]
        public decimal Price { get; set; }

        [Range(0, int.MaxValue, ErrorMessage = "Số lượng tồn kho không được nhỏ hơn 0.")]
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

        [Required]
        [MaxLength(20)]
        [RegularExpression(@"^0\d{9}$", ErrorMessage = "Số điện thoại phải bắt đầu bằng số 0 và có đúng 10 chữ số.")]
        public string PhoneNumber { get; set; } = string.Empty;

        [MaxLength(100)]
        public string Position { get; set; } = string.Empty; // e.g. Masseur, Hair Stylist

        [MaxLength(100)]
        [EmailAddress(ErrorMessage = "Địa chỉ Email không hợp lệ.")]
        public string Email { get; set; } = string.Empty;

        [JsonIgnore]
        public ICollection<Appointment> Appointments { get; set; } = new List<Appointment>();
        [JsonIgnore]
        public ICollection<WorkSchedule> WorkSchedules { get; set; } = new List<WorkSchedule>();
        [JsonIgnore]
        public ICollection<TreatmentSession> TreatmentSessions { get; set; } = new List<TreatmentSession>();
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

        public int? BedId { get; set; }
        [ForeignKey("BedId")]
        public Bed? Bed { get; set; }

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

        public int Quantity { get; set; } = 1;

        [Column(TypeName = "decimal(18,2)")]
        public decimal Price { get; set; }
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
        public ICollection<Payment> Payments { get; set; } = new List<Payment>();
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

        public int Quantity { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal Price { get; set; }
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
        [Range(0, 100, ErrorMessage = "Khuyến mãi phải từ 0 đến 100%.")]
        public decimal DiscountPercent { get; set; }

        public DateTime StartDate { get; set; }
        
        public DateTime EndDate { get; set; }
        
        public int? MaxUsage { get; set; } // Sửa theo yêu cầu: Giới hạn số lần sử dụng
        
        public string? ApplicableServiceIds { get; set; } // Sửa theo yêu cầu: Các dịch vụ được áp dụng (e.g. "ALL" hoặc ",1,2,3,")

        public ICollection<Order> Orders { get; set; } = new List<Order>();
    }

    public class Review
    {
        [Key]
        public int Id { get; set; }

        public int CustomerId { get; set; }
        [ForeignKey("CustomerId")]
        public Customer? Customer { get; set; }

        public int? ServiceId { get; set; }
        [ForeignKey("ServiceId")]
        public Service? Service { get; set; }

        public int Rating { get; set; } // e.g., 1 to 5

        public string Comment { get; set; } = string.Empty;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }

    public class Payment
    {
        [Key]
        public int Id { get; set; }
        
        public int OrderId { get; set; }
        [ForeignKey("OrderId")]
        public Order? Order { get; set; }

        [Required]
        [MaxLength(50)]
        public string PaymentMethod { get; set; } = string.Empty;

        [Column(TypeName = "decimal(18,2)")]
        public decimal Amount { get; set; }

        public DateTime PaymentDate { get; set; } = DateTime.UtcNow;

        [Required]
        [MaxLength(20)]
        public string Status { get; set; } = "Pending";
    }

    public class WorkSchedule
    {
        [Key]
        public int Id { get; set; }

        public int StaffId { get; set; }
        [ForeignKey("StaffId")]
        public Staff? Staff { get; set; }

        public DateTime WorkDate { get; set; }

        public TimeSpan StartTime { get; set; }

        public TimeSpan EndTime { get; set; }
    }

    public class ServiceImage
    {
        [Key]
        public int Id { get; set; }

        public int ServiceId { get; set; }
        [ForeignKey("ServiceId")]
        public Service? Service { get; set; }

        [Required]
        public string ImageUrl { get; set; } = string.Empty;
    }

    public class LoyaltyPoint
    {
        [Key]
        public int Id { get; set; }

        public int CustomerId { get; set; }
        [ForeignKey("CustomerId")]
        public Customer? Customer { get; set; }

        public int Points { get; set; }

        public DateTime UpdatedDate { get; set; } = DateTime.UtcNow;
    }

    public class Notification
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [MaxLength(200)]
        public string Title { get; set; } = string.Empty;

        public string Message { get; set; } = string.Empty;

        public DateTime CreatedDate { get; set; } = DateTime.UtcNow;

        public bool IsRead { get; set; } = false;

        public int UserId { get; set; }
        [ForeignKey("UserId")]
        public User? User { get; set; }
    }
 
    public class Treatment
    {
        [Key]
        public int Id { get; set; }
 
        [Required]
        [MaxLength(200)]
        public string Name { get; set; } = string.Empty;
 
        public string Description { get; set; } = string.Empty;
 
        public int TotalSessions { get; set; }
 
        [Range(0, double.MaxValue, ErrorMessage = "Giá không được nhỏ hơn 0.")]
        public decimal Price { get; set; }
 
        [Range(1, int.MaxValue, ErrorMessage = "Thời gian phải lớn hơn 0.")]
        public int DurationPerSession { get; set; } // minutes
 
        public string? ServiceIds { get; set; } // multi-select services (e.g. ,1,2,3,)

        public DateTime CreatedDate { get; set; } = DateTime.UtcNow;
 
        public ICollection<CustomerTreatment> CustomerTreatments { get; set; } = new List<CustomerTreatment>();
    }
 
    public class CustomerTreatment
    {
        [Key]
        public int Id { get; set; }
 
        public int CustomerId { get; set; }
        [ForeignKey("CustomerId")]
        public Customer? Customer { get; set; }
 
        public int TreatmentId { get; set; }
        [ForeignKey("TreatmentId")]
        public Treatment? Treatment { get; set; }
 
        public DateTime StartDate { get; set; } = DateTime.UtcNow;
        
        public DateTime? EndDate { get; set; }
 
        public int RemainingSessions { get; set; }
 
        [Required]
        [MaxLength(20)]
        public string Status { get; set; } = "Active"; // Active, Completed, Cancelled
 
        public string? Note { get; set; }
 
        public ICollection<TreatmentSession> TreatmentSessions { get; set; } = new List<TreatmentSession>();
    }
 
    public class TreatmentSession
    {
        [Key]
        public int Id { get; set; }
 
        public int CustomerTreatmentId { get; set; }
        [ForeignKey("CustomerTreatmentId")]
        public CustomerTreatment? CustomerTreatment { get; set; }
 
        public int SessionNumber { get; set; }
 
        public DateTime SessionDate { get; set; } = DateTime.UtcNow;
 
        public int StaffId { get; set; }
        [ForeignKey("StaffId")]
        public Staff? Staff { get; set; }
 
        public string? Note { get; set; }
 
        [Required]
        [MaxLength(20)]
        public string Status { get; set; } = "Done"; // Pending, Done, Cancelled
    }

    public class RoomType
    {
        [Key]
        public int Id { get; set; }
        [Required, MaxLength(100)]
        public string Name { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public decimal PriceMultiplier { get; set; } = 1.0m;
        [JsonIgnore]
        public ICollection<Room> Rooms { get; set; } = new List<Room>();
    }

    public class Room
    {
        [Key]
        public int Id { get; set; }
        [Required, MaxLength(100)]
        public string RoomName { get; set; } = string.Empty;
        public int RoomTypeId { get; set; }
        [ForeignKey("RoomTypeId")]
        public RoomType? RoomType { get; set; }
        [MaxLength(20)]
        public string Status { get; set; } = "Available"; // Available, Occupied, Maintenance
        public string Note { get; set; } = string.Empty;
        [JsonIgnore]
        public ICollection<Bed> Beds { get; set; } = new List<Bed>();
    }

    public class Bed
    {
        [Key]
        public int Id { get; set; }
        [Required, MaxLength(100)]
        public string BedName { get; set; } = string.Empty;
        public int RoomId { get; set; }
        [ForeignKey("RoomId")]
        public Room? Room { get; set; }
        [MaxLength(20)]
        public string Status { get; set; } = "Available"; // Available, InUse, Maintenance
        public string Note { get; set; } = string.Empty;
        public ICollection<Appointment> Appointments { get; set; } = new List<Appointment>();
    }
}
