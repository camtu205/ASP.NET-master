using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NguyenThiCamTu_2123110472.Data;
using NguyenThiCamTu_2123110472.Models;

namespace NguyenThiCamTu_2123110472.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class CustomerTreatmentsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public CustomerTreatmentsController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<CustomerTreatment>>> GetCustomerTreatments()
        {
            return await _context.CustomerTreatments
                .Include(ct => ct.Customer)
                .Include(ct => ct.Treatment)
                .ToListAsync();
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<CustomerTreatment>> GetCustomerTreatment(int id)
        {
            var ct = await _context.CustomerTreatments
                .Include(c => c.Customer)
                .Include(c => c.Treatment)
                .Include(c => c.TreatmentSessions)
                .FirstOrDefaultAsync(x => x.Id == id);
            if (ct == null) return NotFound();
            return ct;
        }

        [HttpPost]
        public async Task<ActionResult<CustomerTreatment>> PostCustomerTreatment(CustomerTreatment ct)
        {
            var treatment = await _context.Treatments.FindAsync(ct.TreatmentId);
            if (treatment == null) return BadRequest("Treatment not found");

            // Khởi tạo số buổi còn lại từ tổng số buổi của liệu trình
            ct.RemainingSessions = treatment.TotalSessions;
            ct.Status = "Active";
            ct.StartDate = DateTime.UtcNow;

            _context.CustomerTreatments.Add(ct);
            await _context.SaveChangesAsync();
            return CreatedAtAction("GetCustomerTreatment", new { id = ct.Id }, ct);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> PutCustomerTreatment(int id, CustomerTreatment ct)
        {
            if (id != ct.Id) return BadRequest();
            _context.Entry(ct).State = EntityState.Modified;
            try { await _context.SaveChangesAsync(); }
            catch (DbUpdateConcurrencyException) { if (!CustomerTreatmentExists(id)) return NotFound(); else throw; }
            return NoContent();
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteCustomerTreatment(int id)
        {
            var ct = await _context.CustomerTreatments.FindAsync(id);
            if (ct == null) return NotFound();
            _context.CustomerTreatments.Remove(ct);
            await _context.SaveChangesAsync();
            return NoContent();
        }

        private bool CustomerTreatmentExists(int id) => _context.CustomerTreatments.Any(e => e.Id == id);
    }
}
