using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NguyenThiCamTu_2123110472.Data;
using NguyenThiCamTu_2123110472.Models;

namespace NguyenThiCamTu_2123110472.Controllers
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class AppointmentsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public AppointmentsController(AppDbContext context)
        {
            _context = context;
        }

        // GET: api/Appointments
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Appointment>>> GetAppointments()
        {
            return await _context.Appointments
                .Include(a => a.Customer)
                .Include(a => a.Staff)
                .Include(a => a.AppointmentDetails)
                    .ThenInclude(ad => ad.Service)
                .ToListAsync();
        }

        // GET: api/Appointments/5
        [HttpGet("{id}")]
        public async Task<ActionResult<Appointment>> GetAppointment(int id)
        {
            var appointment = await _context.Appointments
                .Include(a => a.Customer)
                .Include(a => a.Staff)
                .Include(a => a.AppointmentDetails)
                    .ThenInclude(ad => ad.Service)
                .FirstOrDefaultAsync(a => a.Id == id);

            if (appointment == null)
            {
                return NotFound();
            }

            return appointment;
        }

        // POST: api/Appointments/Book
        public class BookingDto
        {
            public int CustomerId { get; set; }
            public DateTime AppointmentDate { get; set; }
            public List<int> ServiceIds { get; set; } = new List<int>();
            public int? StaffId { get; set; }
            public int? BedId { get; set; }
            public bool IgnoreConflicts { get; set; } = false;
        }
 
        [HttpPost("Book")]
        public async Task<ActionResult<Appointment>> BookAppointment([FromBody] BookingDto request)
        {
            // 1. Kiểm tra thời gian: phải sau hiện tại ít nhất 30 phút
            if (request.AppointmentDate < DateTime.Now.AddMinutes(30))
            {
                return BadRequest("Thời gian đặt lịch phải sau thời điểm hiện tại ít nhất 30 phút.");
            }
 
            // 2. Kiểm tra trùng lịch của Khách hàng
            var customerBusy = await _context.Appointments
                .AnyAsync(a => a.CustomerId == request.CustomerId && 
                               a.Status != "Cancelled" &&
                               a.AppointmentDate >= request.AppointmentDate.AddHours(-1) &&
                               a.AppointmentDate <= request.AppointmentDate.AddHours(1));
 
            if (customerBusy && !request.IgnoreConflicts)
            {
                // Trả về Conflict (409) để Frontend hiển thị hộp thoại xác nhận
                return Conflict("Khách hàng đã có một lịch hẹn khác gần khung giờ này. Bạn vẫn muốn tiếp tục chứ?");
            }
 
            // 3. Kiểm tra trùng lịch của Nhân viên (nếu có chọn)
            if (request.StaffId.HasValue)
            {
                var staffBusy = await _context.Appointments
                    .AnyAsync(a => a.StaffId == request.StaffId && 
                                   a.Status != "Cancelled" &&
                                   a.AppointmentDate >= request.AppointmentDate.AddHours(-1) &&
                                   a.AppointmentDate <= request.AppointmentDate.AddHours(1));
                if (staffBusy)
                {
                    return BadRequest("Nhân viên bạn chọn đã có lịch hẹn khác trong khung giờ này. Vui lòng chọn nhân viên khác.");
                }
            }
 
            // Create Appointment
            var appointment = new Appointment
            {
                CustomerId = request.CustomerId,
                AppointmentDate = request.AppointmentDate,
                StaffId = request.StaffId,
                BedId = request.BedId,
                Status = request.StaffId.HasValue ? "Assigned" : "Pending"
            };
 
            _context.Appointments.Add(appointment);
            await _context.SaveChangesAsync();
 
            // Add details
            foreach (var sId in request.ServiceIds)
            {
                var service = await _context.Services.FindAsync(sId);
                if (service != null)
                {
                    var detail = new AppointmentDetail
                    {
                        AppointmentId = appointment.Id,
                        ServiceId = service.Id,
                        Price = service.Price,
                        Quantity = 1
                    };
                    _context.AppointmentDetails.Add(detail);
                }
            }
 
            // Tự động tạo thông báo
            var customer = await _context.Customers.FindAsync(request.CustomerId);
            _context.Notifications.Add(new Notification
            {
                Title = "Lịch hẹn mới",
                Message = $"Đặt lịch mới: Khách {customer?.FullName} vào {request.AppointmentDate:dd/MM/yyyy HH:mm}.",
                CreatedDate = DateTime.UtcNow,
                UserId = 1 
            });
 
            await _context.SaveChangesAsync();
            return CreatedAtAction("GetAppointment", new { id = appointment.Id }, appointment);
        }

        [HttpPut("{id}/AssignStaff")]
        public async Task<IActionResult> AssignStaff(int id, [FromBody] int staffId)
        {
            var appointment = await _context.Appointments.FindAsync(id);
            if (appointment == null) return NotFound();

            var staff = await _context.Staffs.FindAsync(staffId);
            if (staff == null) return BadRequest("Staff not found.");

            // Kiểm tra trùng lịch: Nhân viên bận nếu có lịch khác trong khoảng +/- 1 tiếng
            var isBusy = await _context.Appointments
                .AnyAsync(a => a.StaffId == staffId && 
                               a.Status != "Cancelled" &&
                               a.Id != id &&
                               a.AppointmentDate >= appointment.AppointmentDate.AddHours(-1) &&
                               a.AppointmentDate <= appointment.AppointmentDate.AddHours(1));

            if (isBusy)
            {
                return BadRequest($"Nhân viên {staff.FullName} đã có lịch hẹn khác trong khung giờ này. Vui lòng chọn nhân viên khác hoặc đổi giờ.");
            }

            appointment.StaffId = staffId;
            appointment.Status = "Assigned";
            
            _context.Entry(appointment).State = EntityState.Modified;

            // Thông báo thay đổi trạng thái: Đã phân công
            _context.Notifications.Add(new Notification
            {
                Title = "Lịch hẹn được phân công",
                Message = $"Lịch hẹn #{id} đã được phân công cho nhân viên {staff.FullName}.",
                CreatedDate = DateTime.UtcNow,
                IsRead = false,
                UserId = 1 
            });

            await _context.SaveChangesAsync();
            return NoContent();
        }

        // PUT: api/Appointments/5/Complete
        [HttpPut("{id}/Complete")]
        public async Task<IActionResult> CompleteAppointment(int id)
        {
            var appointment = await _context.Appointments.FindAsync(id);
            if (appointment == null)
            {
                return NotFound();
            }

            appointment.Status = "Done";
            _context.Entry(appointment).State = EntityState.Modified;

            // Thông báo thay đổi trạng thái: Hoàn tất
            _context.Notifications.Add(new Notification
            {
                Title = "Lịch hẹn hoàn tất",
                Message = $"Lịch hẹn #{id} đã hoàn tất. Vui lòng tiến hành thanh toán.",
                CreatedDate = DateTime.UtcNow,
                IsRead = false,
                UserId = 1
            });

            await _context.SaveChangesAsync();

            return NoContent();
        }

        // DELETE: api/Appointments/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteAppointment(int id)
        {
            var appointment = await _context.Appointments.FindAsync(id);
            if (appointment == null)
            {
                return NotFound();
            }

            _context.Appointments.Remove(appointment);

            // Thông báo: Lịch hẹn bị hủy
            _context.Notifications.Add(new Notification
            {
                Title = "Lịch hẹn bị hủy",
                Message = $"Lịch hẹn #{id} đã bị xóa khỏi hệ thống.",
                CreatedDate = DateTime.UtcNow,
                IsRead = false,
                UserId = 1
            });

            await _context.SaveChangesAsync();

            return NoContent();
        }
    }
}
