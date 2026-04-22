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
    public class ReviewsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public ReviewsController(AppDbContext context)
        {
            _context = context;
        }

        [AllowAnonymous]
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Review>>> GetReviews()
        {
            try {
                return await _context.Reviews
                    .Include(r => r.Customer)
                    .Include(r => r.Service)
                    .Include(r => r.Appointment)
                        .ThenInclude(a => a!.AppointmentDetails)
                        .ThenInclude(ad => ad.Service)
                    .OrderByDescending(r => r.CreatedAt)
                    .ToListAsync();
            }
            catch (Exception ex) {
                return StatusCode(500, $"Lỗi truy vấn Review: {ex.Message} - {ex.InnerException?.Message}");
            }
        }

        [AllowAnonymous]
        [HttpGet("Service/{serviceId}")]
        public async Task<ActionResult<IEnumerable<Review>>> GetServiceReviews(int serviceId)
        {
            return await _context.Reviews
                .Where(r => r.ServiceId == serviceId)
                .Include(r => r.Customer)
                .Include(r => r.Appointment)
                .ToListAsync();
        }

        [HttpPost]
        public async Task<ActionResult<Review>> PostReview(Review review)
        {
            // Optional: Check if customer actually used the service
            _context.Reviews.Add(review);
            await _context.SaveChangesAsync();
            return CreatedAtAction("GetReviews", new { id = review.Id }, review);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteReview(int id)
        {
            var review = await _context.Reviews.FindAsync(id);
            if (review == null) return NotFound();
            _context.Reviews.Remove(review);
            await _context.SaveChangesAsync();
            return NoContent();
        }
    }
}
