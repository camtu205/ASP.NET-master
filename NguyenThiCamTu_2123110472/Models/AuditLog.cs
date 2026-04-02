using System.ComponentModel.DataAnnotations;

namespace NguyenThiCamTu_2123110472.Models
{
    public class AuditLog
    {
        [Key]
        public int Id { get; set; }

        public string? UserId { get; set; }
        
        public string Action { get; set; } = string.Empty; // Create, Update, Delete
        
        public string TableName { get; set; } = string.Empty;

        public string? OldValues { get; set; }

        public string? NewValues { get; set; }

        public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    }
}
