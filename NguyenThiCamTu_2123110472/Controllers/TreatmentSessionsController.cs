using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NguyenThiCamTu_2123110472.Data;
using NguyenThiCamTu_2123110472.Models;

namespace NguyenThiCamTu_2123110472.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class TreatmentSessionsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public TreatmentSessionsController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<TreatmentSession>>> GetTreatmentSessions()
        {
            return await _context.TreatmentSessions
                .Include(ts => ts.Staff)
                .Include(ts => ts.CustomerTreatment)
                .ToListAsync();
        }

        [HttpPost]
        public async Task<ActionResult<TreatmentSession>> PostTreatmentSession(TreatmentSession session)
        {
            var ct = await _context.CustomerTreatments
                .Include(x => x.Treatment)
                .FirstOrDefaultAsync(x => x.Id == session.CustomerTreatmentId);
            
            if (ct == null) return BadRequest("Customer Treatment not found");

            // Kiểm tra xem đã hết buổi chưa
            if (ct.RemainingSessions <= 0 && session.Status == "Done")
            {
                return BadRequest("Liệu trình này đã hoàn thành, không thể thêm buổi thực hiện mới.");
            }

            // Gán số thứ tự buổi tự động
            var currentSessions = await _context.TreatmentSessions
                .Where(ts => ts.CustomerTreatmentId == session.CustomerTreatmentId)
                .CountAsync();
            session.SessionNumber = currentSessions + 1;

            if (session.Status == "Done")
            {
                ct.RemainingSessions -= 1;
                if (ct.RemainingSessions <= 0)
                {
                    ct.Status = "Completed";
                    ct.EndDate = DateTime.UtcNow;
                }
            }

            _context.TreatmentSessions.Add(session);
            await _context.SaveChangesAsync();

            return Ok(session);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> PutTreatmentSession(int id, TreatmentSession session)
        {
            if (id != session.Id) return BadRequest();

            // Lấy trạng thái cũ để so sánh
            var oldSession = await _context.TreatmentSessions.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id);
            if (oldSession == null) return NotFound();

            var ct = await _context.CustomerTreatments.FindAsync(session.CustomerTreatmentId);
            if (ct == null) return BadRequest("Customer Treatment not found");

            // Nếu đổi từ trạng thái khác sang Done
            if (oldSession.Status != "Done" && session.Status == "Done")
            {
                if (ct.RemainingSessions <= 0) return BadRequest("Hết buổi.");
                ct.RemainingSessions -= 1;
            }
            // Nếu đổi từ Done sang trạng thái khác (hủy/pending lại)
            else if (oldSession.Status == "Done" && session.Status != "Done")
            {
                ct.RemainingSessions += 1;
            }

            // Cập nhật trạng thái tổng quát của liệu trình
            if (ct.RemainingSessions <= 0)
            {
                ct.Status = "Completed";
                ct.EndDate = DateTime.UtcNow;
            }
            else
            {
                ct.Status = "Active";
                ct.EndDate = null;
            }

            _context.Entry(session).State = EntityState.Modified;
            await _context.SaveChangesAsync();

            return NoContent();
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteTreatmentSession(int id)
        {
            var session = await _context.TreatmentSessions.FindAsync(id);
            if (session == null) return NotFound();

            var ct = await _context.CustomerTreatments.FindAsync(session.CustomerTreatmentId);
            if (ct != null && session.Status == "Done")
            {
                ct.RemainingSessions += 1;
                ct.Status = "Active";
            }

            _context.TreatmentSessions.Remove(session);
            await _context.SaveChangesAsync();
            return NoContent();
        }
    }
}
