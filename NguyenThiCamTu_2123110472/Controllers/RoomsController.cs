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
    public class RoomsController : ControllerBase
    {
        private readonly AppDbContext _context;
        public RoomsController(AppDbContext context) { _context = context; }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<Room>>> GetRooms() => await _context.Rooms.Include(r => r.RoomType).ToListAsync();

        [HttpGet("{id}")]
        public async Task<ActionResult<Room>> GetRoom(int id)
        {
            var item = await _context.Rooms.Include(r => r.RoomType).FirstOrDefaultAsync(x => x.Id == id);
            return item == null ? NotFound() : item;
        }

        [HttpPost]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<Room>> PostRoom(Room item)
        {
            _context.Rooms.Add(item);
            await _context.SaveChangesAsync();
            return CreatedAtAction("GetRoom", new { id = item.Id }, item);
        }

        [HttpPut("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> PutRoom(int id, Room item)
        {
            if (id != item.Id) return BadRequest();
            _context.Entry(item).State = EntityState.Modified;
            await _context.SaveChangesAsync();
            return NoContent();
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> DeleteRoom(int id)
        {
            var item = await _context.Rooms.FindAsync(id);
            if (item == null) return NotFound();
            _context.Rooms.Remove(item);
            await _context.SaveChangesAsync();
            return NoContent();
        }
    }
}
