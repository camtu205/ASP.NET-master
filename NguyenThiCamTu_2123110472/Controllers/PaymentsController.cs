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
    public class PaymentsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public PaymentsController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<Payment>>> GetPayments()
        {
            return await _context.Payments.Include(p => p.Order).ToListAsync();
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<Payment>> GetPayment(int id)
        {
            var payment = await _context.Payments.Include(p => p.Order).FirstOrDefaultAsync(p => p.Id == id);
            if (payment == null) return NotFound();
            return payment;
        }

        [HttpPost]
        public async Task<ActionResult<Payment>> PostPayment(Payment payment)
        {
            _context.Payments.Add(payment);

            // Logic sau khi thanh toán thành công
            if (payment.Status == "Completed" || payment.Status == "Paid")
            {
                var order = await _context.Orders.FindAsync(payment.OrderId);
                if (order != null)
                {
                    // 1. Quy đổi điểm thưởng: 10,000 = 1 điểm
                    int pointsEarned = (int)(payment.Amount / 10000);
                    if (pointsEarned > 0)
                    {
                        var loyaltyPoint = await _context.LoyaltyPoints
                            .FirstOrDefaultAsync(lp => lp.CustomerId == order.CustomerId);

                        if (loyaltyPoint == null)
                        {
                            loyaltyPoint = new LoyaltyPoint
                            {
                                CustomerId = order.CustomerId,
                                Points = pointsEarned,
                                UpdatedDate = DateTime.UtcNow
                            };
                            _context.LoyaltyPoints.Add(loyaltyPoint);
                        }
                        else
                        {
                            loyaltyPoint.Points += pointsEarned;
                            loyaltyPoint.UpdatedDate = DateTime.UtcNow;
                        }
                    }

                    // 2. Tạo thông báo tự động khi thanh toán thành công
                    var notification = new Notification
                    {
                        Title = "Thanh toán thành công",
                        Message = $"Đơn hàng #{order.Id} đã được thanh toán thành công số tiền {payment.Amount:N0} VNĐ. Bạn tích lũy thêm {pointsEarned} điểm.",
                        CreatedDate = DateTime.UtcNow,
                        IsRead = false,
                        UserId = 1 // Giả định gửi cho Admin hoặc mapping UserId từ Customer
                    };
                    _context.Notifications.Add(notification);
                }
            }

            await _context.SaveChangesAsync();

            return CreatedAtAction("GetPayment", new { id = payment.Id }, payment);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> PutPayment(int id, Payment payment)
        {
            if (id != payment.Id) return BadRequest();

            _context.Entry(payment).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!PaymentExists(id)) return NotFound();
                else throw;
            }

            return NoContent();
        }

        private bool PaymentExists(int id)
        {
            return _context.Payments.Any(e => e.Id == id);
        }
    }
}
