using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NguyenThiCamTu_2123110472.Data;
using NguyenThiCamTu_2123110472.Models;
using NguyenThiCamTu_2123110472.Services;

namespace NguyenThiCamTu_2123110472.Controllers
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class AppointmentsController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly VnPayService _vnpayService;

        public AppointmentsController(AppDbContext context, VnPayService vnpayService)
        {
            _context = context;
            _vnpayService = vnpayService;
        }

        private async Task<DateTime> CalculateEndTime(DateTime start, IEnumerable<int> serviceIds)
        {
            int totalDuration = 0;
            foreach (var sId in serviceIds)
            {
                var service = await _context.Services.FindAsync(sId);
                if (service != null) totalDuration += service.DurationMinutes;
            }
            return start.AddMinutes(totalDuration + 10);
        }

        private async Task<DateTime> GetAppointmentEndTime(Appointment app)
        {
            int totalDuration = 0;
            var details = app.AppointmentDetails;
            if (details == null) details = await _context.AppointmentDetails.Where(d => d.AppointmentId == app.Id).ToListAsync();
            
            foreach (var detail in details)
            {
                var service = await _context.Services.FindAsync(detail.ServiceId);
                if (service != null) totalDuration += service.DurationMinutes;
            }
            return app.AppointmentDate.AddMinutes(totalDuration + 10);
        }

        // GET: api/Appointments
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Appointment>>> GetAppointments()
        {
            return await _context.Appointments
                .Include(a => a.Customer)
                .Include(a => a.Staff)
                .Include(a => a.Bed).ThenInclude(b => b!.Room).ThenInclude(r => r!.RoomType)
                .Include(a => a.AppointmentDetails).ThenInclude(ad => ad.Service)
                .OrderByDescending(a => a.AppointmentDate)
                .ToListAsync();
        }
 
        [HttpGet("MyAppointments")]
        public async Task<ActionResult<IEnumerable<Appointment>>> GetMyAppointments(int customerId)
        {
            return await _context.Appointments
                .Where(a => a.CustomerId == customerId && a.Status != "Deleted")
                .Include(a => a.Staff)
                .Include(a => a.Bed).ThenInclude(b => b!.Room).ThenInclude(r => r!.RoomType)
                .Include(a => a.AppointmentDetails).ThenInclude(ad => ad.Service)
                .OrderByDescending(a => a.AppointmentDate)
                .ToListAsync();
        }

        [HttpGet("{id}/AvailableBeds")]
        public async Task<ActionResult<IEnumerable<Bed>>> GetAvailableBeds(int id)
        {
            var app = await _context.Appointments
                .Include(a => a.AppointmentDetails)
                .FirstOrDefaultAsync(a => a.Id == id);
            if (app == null) return NotFound();

            var newStart = app.AppointmentDate;
            var newEnd = await GetAppointmentEndTime(app);

            var allBeds = await _context.Beds.Include(b => b.Room).ToListAsync();
            var appointments = await _context.Appointments
                .Include(a => a.AppointmentDetails)
                .Where(a => a.Id != id && a.BedId != null && a.Status != "Deleted")
                .ToListAsync();

            var availableBeds = new List<Bed>();

            foreach (var bed in allBeds)
            {
                bool isOccupied = false;
                var bedApps = appointments.Where(a => a.BedId == bed.Id);
                foreach (var exApp in bedApps)
                {
                    var exStart = exApp.AppointmentDate;
                    var exEnd = await GetAppointmentEndTime(exApp);

                    // Overlap check
                    if (newStart < exEnd && newEnd > exStart)
                    {
                        isOccupied = true;
                        break;
                    }
                }
                if (!isOccupied) availableBeds.Add(bed);
            }

            return availableBeds;
        }

        // GET: api/Appointments/5
        [HttpGet("{id}")]
        public async Task<ActionResult<Appointment>> GetAppointment(int id)
        {
            var appointment = await _context.Appointments
                .Include(a => a.Customer)
                .Include(a => a.Staff)
                .Include(a => a.Bed).ThenInclude(b => b!.Room).ThenInclude(r => r!.RoomType)
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
            public int? PromotionId { get; set; }
            public bool IgnoreConflicts { get; set; } = false;
            public bool IsPrepaid { get; set; } = false;
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
                               a.Status != "Deleted" &&
                               a.AppointmentDate >= request.AppointmentDate.AddHours(-1) &&
                               a.AppointmentDate <= request.AppointmentDate.AddHours(1));
 
            if (customerBusy && !request.IgnoreConflicts)
            {
                return Conflict("Khách hàng đã có một lịch hẹn khác gần khung giờ này. Bạn vẫn muốn tiếp tục chứ?");
            }
 
            // 3. Kiểm tra trùng giường
            if (request.BedId.HasValue)
            {
                var newEnd = await CalculateEndTime(request.AppointmentDate, request.ServiceIds);
                var conflicts = await _context.Appointments
                    .Include(a => a.AppointmentDetails)
                    .Where(a => a.BedId == request.BedId && a.Status != "Cancelled" && a.Status != "Deleted")
                    .ToListAsync();
                foreach (var ex in conflicts)
                {
                    var exEnd = await GetAppointmentEndTime(ex);
                    if (request.AppointmentDate < exEnd && newEnd > ex.AppointmentDate)
                    {
                        return BadRequest($"Giường này đã bận từ {ex.AppointmentDate:HH:mm} đến {exEnd:HH:mm}.");
                    }
                }
            }

            // Tự động gán nhân viên nếu thanh toán trước mà không chọn staff cụ thể
            int? assignedStaffId = request.StaffId;
            if (request.IsPrepaid && !assignedStaffId.HasValue)
            {
                // Chọn nhân viên Kỹ thuật viên đầu tiên không bận khung giờ này
                var busyStaffIds = await _context.Appointments
                    .Where(a => a.Status != "Cancelled" && a.Status != "Deleted" && a.StaffId != null &&
                                a.AppointmentDate >= request.AppointmentDate.AddHours(-1) &&
                                a.AppointmentDate <= request.AppointmentDate.AddHours(1))
                    .Select(a => a.StaffId)
                    .ToListAsync();
                
                var availableStaff = await _context.Staffs
                    .Where(s => s.Position == "Kỹ thuật viên" && !busyStaffIds.Contains(s.Id))
                    .FirstOrDefaultAsync();
                
                if (availableStaff != null) assignedStaffId = availableStaff.Id;
            }

            var appointment = new Appointment
            {
                CustomerId = request.CustomerId,
                AppointmentDate = request.AppointmentDate,
                StaffId = assignedStaffId,
                BedId = request.BedId,
                IsPrepaid = request.IsPrepaid,
                Status = assignedStaffId.HasValue ? "Assigned" : "Pending"
            };
 
            _context.Appointments.Add(appointment);
            await _context.SaveChangesAsync();

            decimal totalBeforeDiscount = 0;
            var detailsToAdd = new List<AppointmentDetail>();

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
                    detailsToAdd.Add(detail);
                    totalBeforeDiscount += service.Price;
                }
            }
            _context.AppointmentDetails.AddRange(detailsToAdd);

            // Xử lý giảm giá Thanh toán trước (5%, tối đa 100k)
            decimal prepaidDiscount = 0;
            if (request.IsPrepaid)
            {
                prepaidDiscount = totalBeforeDiscount * 0.05m;
                if (prepaidDiscount > 100000) prepaidDiscount = 100000;
            }

            decimal finalTotal = totalBeforeDiscount - prepaidDiscount;
            appointment.TotalPrice = finalTotal;
            appointment.PrepaidAmount = request.IsPrepaid ? finalTotal : 0;

            string? paymentUrl = null;

            // Nếu thanh toán trước, tạo luôn Order và Payment
            if (request.IsPrepaid)
            {
                var order = new Order
                {
                    CustomerId = request.CustomerId,
                    AppointmentId = appointment.Id,
                    OrderDate = DateTime.Now,
                    TotalAmount = finalTotal,
                    PromotionId = request.PromotionId
                };
                _context.Orders.Add(order);
                await _context.SaveChangesAsync();

                foreach (var detail in detailsToAdd)
                {
                    _context.OrderDetails.Add(new OrderDetail {
                        OrderId = order.Id,
                        ServiceId = detail.ServiceId,
                        Quantity = 1,
                        Price = detail.Price
                    });
                }

                _context.Payments.Add(new Payment {
                    OrderId = order.Id,
                    Amount = finalTotal,
                    PaymentDate = DateTime.Now,
                    PaymentMethod = "VNPAY",
                    Status = "Pending" 
                });

                paymentUrl = _vnpayService.CreatePaymentUrl(HttpContext, new PaymentInformationModel {
                    OrderId = order.Id,
                    Amount = (double)finalTotal,
                    OrderDescription = $"Thanh toan lich hen #{appointment.Id}",
                    OrderType = "appointment"
                });
            }
 
            // Notify Admin
            var customer = await _context.Customers.FindAsync(request.CustomerId);
            await AppDbContext.CreateNotification(_context, request.IsPrepaid ? "Yêu cầu thanh toán trước" : "Lịch hẹn mới", 
                $"{(request.IsPrepaid ? "[CHỜ THANH TOÁN] " : "")}Lịch hẹn: {customer?.FullName} vào {request.AppointmentDate:dd/MM/yyyy HH:mm}.", 1, "Appointment", appointment.Id);

            await _context.SaveChangesAsync();

            return Ok(new { 
                appointment, 
                paymentUrl,
                message = request.IsPrepaid ? "Vui lòng hoàn tất thanh toán." : "Đặt lịch thành công."
            });
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> PutAppointment(int id, [FromBody] BookingDto request)
        {
            var appointment = await _context.Appointments
                .Include(a => a.AppointmentDetails)
                .FirstOrDefaultAsync(a => a.Id == id);
 
            if (appointment == null) return NotFound();

            if (appointment.IsPrepaid)
            {
                return BadRequest("Lịch hẹn đã thanh toán trước không thể chỉnh sửa.");
            }
 
            // 1. Kiểm tra điều kiện: không được sửa khi còn dưới 30 phút
            if (appointment.AppointmentDate < DateTime.Now.AddMinutes(30))
            {
                return BadRequest("Không thể chỉnh sửa lịch hẹn khi còn dưới 30 phút tới giờ hẹn.");
            }

            // 2. Kiểm tra thời gian mới: cũng phải sau hiện tại ít nhất 30 phút
            if (request.AppointmentDate < DateTime.Now.AddMinutes(30))
            {
                return BadRequest("Thời gian mới phải sau thời điểm hiện tại ít nhất 30 phút.");
            }

            // 3. Kiểm tra trùng giường
            if (request.BedId.HasValue)
            {
                var newEnd = await CalculateEndTime(request.AppointmentDate, request.ServiceIds);
                var conflicts = await _context.Appointments
                    .Include(a => a.AppointmentDetails)
                    .Where(a => a.BedId == request.BedId && a.Id != id && a.Status != "Cancelled" && a.Status != "Deleted")
                    .ToListAsync();
                foreach (var ex in conflicts)
                {
                    var exEnd = await GetAppointmentEndTime(ex);
                    if (request.AppointmentDate < exEnd && newEnd > ex.AppointmentDate)
                    {
                        return BadRequest($"Giường này đã có người đặt trong khoảng {ex.AppointmentDate:HH:mm} - {exEnd:HH:mm}.");
                    }
                }
            }

            // 4. Cập nhật thông tin cơ bản
            appointment.AppointmentDate = request.AppointmentDate;
            appointment.StaffId = request.StaffId;
            appointment.BedId = request.BedId;
            if (request.StaffId.HasValue) appointment.Status = "Assigned";

            _context.Entry(appointment).State = EntityState.Modified;

            // 4. Cập nhật Services (Xóa cũ thêm mới)
            _context.AppointmentDetails.RemoveRange(appointment.AppointmentDetails);
            foreach (var sId in request.ServiceIds)
            {
                var service = await _context.Services.FindAsync(sId);
                if (service != null)
                {
                    _context.AppointmentDetails.Add(new AppointmentDetail
                    {
                        AppointmentId = appointment.Id,
                        ServiceId = service.Id,
                        Price = service.Price,
                        Quantity = 1
                    });
                }
            }

            await _context.SaveChangesAsync();
            return NoContent();
        }

        public class AssignRequest { public int StaffId { get; set; } public int? BedId { get; set; } }

        [HttpPut("{id}/Assign")]
        public async Task<IActionResult> Assign(int id, [FromBody] AssignRequest request)
        {
            var appointment = await _context.Appointments
                .Include(a => a.AppointmentDetails)
                .FirstOrDefaultAsync(a => a.Id == id);
            if (appointment == null) return NotFound();

            var staff = await _context.Staffs.FindAsync(request.StaffId);
            if (staff == null) return BadRequest("Staff not found.");

            if (request.BedId.HasValue)
            {
                var newStart = appointment.AppointmentDate;
                var newEnd = await GetAppointmentEndTime(appointment);

                var conflicts = await _context.Appointments
                    .Include(a => a.AppointmentDetails)
                    .Where(a => a.BedId == request.BedId && a.Id != id && a.Status != "Cancelled" && a.Status != "Deleted")
                    .ToListAsync();

                foreach (var ex in conflicts)
                {
                    var exEnd = await GetAppointmentEndTime(ex);
                    if (newStart < exEnd && newEnd > ex.AppointmentDate)
                    {
                        return BadRequest($"Giường này đã có người đặt trong khoảng {ex.AppointmentDate:HH:mm} - {exEnd:HH:mm}.");
                    }
                }
            }

            appointment.StaffId = request.StaffId;
            appointment.BedId = request.BedId;
            appointment.Status = "Assigned";
            
            await _context.SaveChangesAsync();

            // Notify Admin
            await AppDbContext.CreateNotification(_context, "Lịch hẹn được phân công", $"Lịch hẹn #{id} đã được phân công cho nhân viên {staff.FullName}.", 1, "Appointment", id);

            // Notify Customer
            var customer = await _context.Customers.FindAsync(appointment.CustomerId);
            if (customer != null && !string.IsNullOrEmpty(customer.Username))
            {
                var user = await _context.Users.FirstOrDefaultAsync(u => u.Username == customer.Username);
                if (user != null)
                {
                    await AppDbContext.CreateNotification(_context, "Cập nhật lịch hẹn", $"Lịch hẹn của bạn vào {appointment.AppointmentDate:dd/MM/yyyy HH:mm} đã được gán nhân viên {staff.FullName}.", user.Id, "Appointment", id);
                }
            }

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
            await _context.SaveChangesAsync();

            // Notify Admin
            await AppDbContext.CreateNotification(_context, "Lịch hẹn hoàn tất", $"Lịch hẹn #{id} đã hoàn tất.", 1, "Appointment", id);

            // Notify Customer
            var customer = await _context.Customers.FindAsync(appointment.CustomerId);
            if (customer != null && !string.IsNullOrEmpty(customer.Username))
            {
                var user = await _context.Users.FirstOrDefaultAsync(u => u.Username == customer.Username);
                if (user != null)
                {
                    await AppDbContext.CreateNotification(_context, "Hoàn tất dịch vụ", $"Dịch vụ của bạn đã hoàn tất. Cảm ơn bạn!", user.Id, "Appointment", id);
                }
            }

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
