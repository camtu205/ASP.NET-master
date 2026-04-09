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
    public class LoyaltyPointsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public LoyaltyPointsController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet("{customerId}")]
        public async Task<ActionResult<LoyaltyPoint>> GetLoyaltyPoints(int customerId)
        {
            var loyaltyPoint = await _context.LoyaltyPoints.FirstOrDefaultAsync(lp => lp.CustomerId == customerId);
            if (loyaltyPoint == null) return NotFound();
            return loyaltyPoint;
        }

        [HttpPost("Adjust")]
        public async Task<IActionResult> AdjustPoints(int customerId, int pointsDelta)
        {
            var lp = await _context.LoyaltyPoints.FirstOrDefaultAsync(l => l.CustomerId == customerId);
            if (lp == null)
            {
                lp = new LoyaltyPoint
                {
                    CustomerId = customerId,
                    Points = pointsDelta,
                    UpdatedDate = DateTime.UtcNow
                };
                _context.LoyaltyPoints.Add(lp);
            }
            else
            {
                lp.Points += pointsDelta;
                lp.UpdatedDate = DateTime.UtcNow;
            }

            await _context.SaveChangesAsync();
            return Ok(lp);
        }
    }
}
