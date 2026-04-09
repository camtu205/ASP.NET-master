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
    public class ServiceImagesController : ControllerBase
    {
        private readonly AppDbContext _context;

        public ServiceImagesController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<ServiceImage>>> GetServiceImages()
        {
            return await _context.ServiceImages.ToListAsync();
        }

        [HttpGet("Service/{serviceId}")]
        public async Task<ActionResult<IEnumerable<ServiceImage>>> GetImagesByService(int serviceId)
        {
            return await _context.ServiceImages.Where(si => si.ServiceId == serviceId).ToListAsync();
        }

        [HttpPost]
        public async Task<ActionResult<ServiceImage>> PostServiceImage(ServiceImage serviceImage)
        {
            _context.ServiceImages.Add(serviceImage);
            await _context.SaveChangesAsync();
            return Ok(serviceImage);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteServiceImage(int id)
        {
            var serviceImage = await _context.ServiceImages.FindAsync(id);
            if (serviceImage == null) return NotFound();

            _context.ServiceImages.Remove(serviceImage);
            await _context.SaveChangesAsync();
            return NoContent();
        }
    }
}
