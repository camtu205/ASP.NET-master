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
    public class ServiceCategoriesController : ControllerBase
    {
        private readonly AppDbContext _context;

        public ServiceCategoriesController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<ServiceCategory>>> GetServiceCategories()
        {
            return await _context.ServiceCategories.Include(c => c.Services).ToListAsync();
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<ServiceCategory>> GetServiceCategory(int id)
        {
            var category = await _context.ServiceCategories.Include(c => c.Services).FirstOrDefaultAsync(c => c.Id == id);
            if (category == null) return NotFound();
            return category;
        }

        [HttpPost]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<ServiceCategory>> PostServiceCategory(ServiceCategory category)
        {
            _context.ServiceCategories.Add(category);
            await _context.SaveChangesAsync();
            return CreatedAtAction("GetServiceCategory", new { id = category.Id }, category);
        }

        [HttpPut("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> PutServiceCategory(int id, ServiceCategory category)
        {
            if (id != category.Id) return BadRequest();
            _context.Entry(category).State = EntityState.Modified;
            await _context.SaveChangesAsync();
            return NoContent();
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> DeleteServiceCategory(int id)
        {
            var category = await _context.ServiceCategories.FindAsync(id);
            if (category == null) return NotFound();
            _context.ServiceCategories.Remove(category);
            await _context.SaveChangesAsync();
            return NoContent();
        }
    }
}
