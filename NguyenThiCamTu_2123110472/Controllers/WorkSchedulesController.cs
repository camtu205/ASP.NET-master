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
    public class WorkSchedulesController : ControllerBase
    {
        private readonly AppDbContext _context;

        public WorkSchedulesController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<WorkSchedule>>> GetWorkSchedules()
        {
            return await _context.WorkSchedules.Include(w => w.Staff).ToListAsync();
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<WorkSchedule>> GetWorkSchedule(int id)
        {
            var workSchedule = await _context.WorkSchedules.Include(w => w.Staff).FirstOrDefaultAsync(w => w.Id == id);
            if (workSchedule == null) return NotFound();
            return workSchedule;
        }

        [HttpPost]
        public async Task<ActionResult<WorkSchedule>> PostWorkSchedule(WorkSchedule workSchedule)
        {
            // Logic chặn trùng lịch: Cùng nhân viên, cùng ngày, và thời gian chồng lấn
            var isOverlapping = await _context.WorkSchedules
                .AnyAsync(w => w.StaffId == workSchedule.StaffId 
                               && w.WorkDate.Date == workSchedule.WorkDate.Date
                               && ((workSchedule.StartTime < w.EndTime) && (workSchedule.EndTime > w.StartTime)));

            if (isOverlapping)
            {
                return BadRequest("Nhân viên này đã có lịch làm việc trùng trong khoảng thời gian này.");
            }

            _context.WorkSchedules.Add(workSchedule);
            await _context.SaveChangesAsync();

            return CreatedAtAction("GetWorkSchedule", new { id = workSchedule.Id }, workSchedule);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> PutWorkSchedule(int id, WorkSchedule workSchedule)
        {
            if (id != workSchedule.Id) return BadRequest();

            // Kiểm tra trùng lịch khi cập nhật (loại trừ chính bản ghi này)
            var isOverlapping = await _context.WorkSchedules
                .AnyAsync(w => w.Id != id 
                               && w.StaffId == workSchedule.StaffId 
                               && w.WorkDate.Date == workSchedule.WorkDate.Date
                               && ((workSchedule.StartTime < w.EndTime) && (workSchedule.EndTime > w.StartTime)));

            if (isOverlapping)
            {
                return BadRequest("Cập nhật thất bại: Nhân viên đã có lịch làm việc trùng trong khoảng thời gian này.");
            }

            _context.Entry(workSchedule).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!WorkScheduleExists(id)) return NotFound();
                else throw;
            }

            return NoContent();
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteWorkSchedule(int id)
        {
            var workSchedule = await _context.WorkSchedules.FindAsync(id);
            if (workSchedule == null) return NotFound();

            _context.WorkSchedules.Remove(workSchedule);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        private bool WorkScheduleExists(int id)
        {
            return _context.WorkSchedules.Any(e => e.Id == id);
        }
    }
}
