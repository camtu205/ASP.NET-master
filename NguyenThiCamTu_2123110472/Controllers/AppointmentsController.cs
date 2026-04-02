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
        // Book multiple services
        public class BookingDto
        {
            public int CustomerId { get; set; }
            public DateTime AppointmentDate { get; set; }
            public List<int> ServiceIds { get; set; } = new List<int>();
        }

        [HttpPost("Book")]
        public async Task<ActionResult<Appointment>> BookAppointment([FromBody] BookingDto request)
        {
            // Create Appointment
            var appointment = new Appointment
            {
                CustomerId = request.CustomerId,
                AppointmentDate = request.AppointmentDate,
                Status = "Pending"
            };

            _context.Appointments.Add(appointment);
            await _context.SaveChangesAsync(); // to get the ID

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
                        PriceAtTime = service.Price
                    };
                    _context.AppointmentDetails.Add(detail);
                }
            }

            await _context.SaveChangesAsync();

            return CreatedAtAction("GetAppointment", new { id = appointment.Id }, appointment);
        }

        // PUT: api/Appointments/5/AssignStaff
        [HttpPut("{id}/AssignStaff")]
        public async Task<IActionResult> AssignStaff(int id, [FromBody] int staffId)
        {
            var appointment = await _context.Appointments.FindAsync(id);
            if (appointment == null)
            {
                return NotFound();
            }

            var staff = await _context.Staffs.FindAsync(staffId);
            if (staff == null)
            {
                return BadRequest("Staff not found.");
            }

            appointment.StaffId = staffId;
            appointment.Status = "Assigned";
            
            _context.Entry(appointment).State = EntityState.Modified;
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
            await _context.SaveChangesAsync();

            return NoContent();
        }
    }
}
