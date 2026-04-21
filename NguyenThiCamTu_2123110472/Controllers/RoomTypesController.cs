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
    public class RoomTypesController : ControllerBase
    {
        private readonly AppDbContext _context;
        public RoomTypesController(AppDbContext context) { _context = context; }

        [AllowAnonymous]
        [HttpGet]
        public async Task<ActionResult<IEnumerable<RoomType>>> GetRoomTypes() => await _context.RoomTypes.ToListAsync();

        [AllowAnonymous]
        [HttpGet("{id}")]
        public async Task<ActionResult<RoomType>> GetRoomType(int id)
        {
            var item = await _context.RoomTypes.FindAsync(id);
            return item == null ? NotFound() : item;
        }

        [HttpPost]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<RoomType>> PostRoomType(RoomType item)
        {
            _context.RoomTypes.Add(item);
            await _context.SaveChangesAsync();
            return CreatedAtAction("GetRoomType", new { id = item.Id }, item);
        }

        [HttpPut("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> PutRoomType(int id, RoomType item)
        {
            if (id != item.Id) return BadRequest();
            _context.Entry(item).State = EntityState.Modified;
            await _context.SaveChangesAsync();
            return NoContent();
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> DeleteRoomType(int id)
        {
            var item = await _context.RoomTypes.FindAsync(id);
            if (item == null) return NotFound();
            _context.RoomTypes.Remove(item);
            await _context.SaveChangesAsync();
            return NoContent();
        }
    }
}
