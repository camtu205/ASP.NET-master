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
    public class BedsController : ControllerBase
    {
        private readonly AppDbContext _context;
        public BedsController(AppDbContext context) { _context = context; }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<Bed>>> GetBeds() => await _context.Beds.Include(b => b.Room).ThenInclude(r => r!.RoomType).ToListAsync();

        [HttpGet("{id}")]
        public async Task<ActionResult<Bed>> GetBed(int id)
        {
            var item = await _context.Beds.Include(b => b.Room).ThenInclude(r => r!.RoomType).FirstOrDefaultAsync(x => x.Id == id);
            return item == null ? NotFound() : item;
        }

        [HttpPost]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<Bed>> PostBed(Bed item)
        {
            _context.Beds.Add(item);
            await _context.SaveChangesAsync();
            return CreatedAtAction("GetBed", new { id = item.Id }, item);
        }

        [HttpPut("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> PutBed(int id, Bed item)
        {
            if (id != item.Id) return BadRequest();
            _context.Entry(item).State = EntityState.Modified;
            await _context.SaveChangesAsync();
            return NoContent();
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> DeleteBed(int id)
        {
            var item = await _context.Beds.FindAsync(id);
            if (item == null) return NotFound();
            _context.Beds.Remove(item);
            await _context.SaveChangesAsync();
            return NoContent();
        }
    }
}
