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
    public class OrdersController : ControllerBase
    {
        private readonly AppDbContext _context;

        public OrdersController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<Order>>> GetOrders()
        {
            return await _context.Orders
                .Include(o => o.Customer)
                .Include(o => o.OrderDetails)
                    .ThenInclude(od => od.Service)
                .Include(o => o.OrderDetails)
                    .ThenInclude(od => od.Product)
                .ToListAsync();
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<Order>> GetOrder(int id)
        {
            var order = await _context.Orders
                .Include(o => o.Customer)
                .Include(o => o.OrderDetails)
                .FirstOrDefaultAsync(o => o.Id == id);

            if (order == null) return NotFound();
            return order;
        }

        public class CheckoutRequest
        {
            public int AppointmentId { get; set; }
            public List<int> ProductIds { get; set; } = new List<int>();
            public int? PromotionId { get; set; }
        }

        [HttpPost("Checkout")]
        public async Task<ActionResult<Order>> Checkout([FromBody] CheckoutRequest request)
        {
            var appointment = await _context.Appointments
                .Include(a => a.AppointmentDetails)
                .Include(a => a.Bed)
                    .ThenInclude(b => b.Room)
                        .ThenInclude(r => r.RoomType)
                .FirstOrDefaultAsync(a => a.Id == request.AppointmentId);

            if (appointment == null || appointment.Status != "Done")
            {
                return BadRequest("Appointment not found or not completed.");
            }

            var order = new Order
            {
                CustomerId = appointment.CustomerId,
                AppointmentId = appointment.Id,
                PromotionId = request.PromotionId,
                OrderDate = DateTime.Now,
                TotalAmount = 0
            };

            decimal total = 0;

            // Add services from appointment to order detail
            foreach (var appDetail in appointment.AppointmentDetails)
            {
                var od = new OrderDetail
                {
                    ServiceId = appDetail.ServiceId,
                    Quantity = 1,
                    Price = appDetail.Price
                };
                order.OrderDetails.Add(od);
                total += od.Price * od.Quantity;
            }

            // Products
            foreach (var pId in request.ProductIds)
            {
                var product = await _context.Products.FindAsync(pId);
                if (product != null && product.StockQuantity > 0)
                {
                    var od = new OrderDetail
                    {
                        ProductId = product.Id,
                        Quantity = 1,
                        Price = product.Price
                    };
                    order.OrderDetails.Add(od);
                    total += od.Price * od.Quantity;
                    
                    product.StockQuantity -= 1; // Giảm tồn kho
                }
            }

            // Apply Promotion
            if (request.PromotionId.HasValue)
            {
                var promo = await _context.Promotions
                    .Include(p => p.Orders)
                    .FirstOrDefaultAsync(p => p.Id == request.PromotionId.Value);

                if (promo != null && promo.StartDate <= DateTime.Now && promo.EndDate >= DateTime.Now)
                {
                    // 1. Kiểm tra số lần sử dụng
                    if (promo.MaxUsage.HasValue && promo.Orders.Count >= promo.MaxUsage.Value)
                    {
                        return BadRequest("Khuyến mãi đã hết lượt sử dụng.");
                    }

                    // 2. Tính tiền được giảm dựa trên các dịch vụ áp dụng
                    decimal discountableAmount = 0;
                    var appIds = (promo.ApplicableServiceIds ?? "ALL").ToUpper();

                    foreach (var od in order.OrderDetails)
                    {
                        if (od.ServiceId.HasValue)
                        {
                            bool isApplicable = appIds == "ALL" || appIds.Contains($",{od.ServiceId},");
                            if (isApplicable)
                            {
                                discountableAmount += od.Price * od.Quantity;
                            }
                        }
                    }

                    if (discountableAmount > 0)
                    {
                        decimal discount = discountableAmount * (promo.DiscountPercent / 100);
                        total -= discount;
                    }
                }
            }

            // Apply Room Type Multiplier
            if (appointment.Bed?.Room?.RoomType != null)
            {
                total *= appointment.Bed.Room.RoomType.PriceMultiplier;
            }

            order.TotalAmount = total;
            
            _context.Orders.Add(order);

            // Quy đổi điểm thưởng: 10,000đ = 1 điểm
            int earnedPoints = (int)(total / 10000);
            if (earnedPoints > 0)
            {
                var lp = await _context.LoyaltyPoints.FirstOrDefaultAsync(x => x.CustomerId == order.CustomerId);
                if (lp == null)
                {
                    lp = new LoyaltyPoint { CustomerId = order.CustomerId, Points = earnedPoints, UpdatedDate = DateTime.UtcNow };
                    _context.LoyaltyPoints.Add(lp);
                }
                else
                {
                    lp.Points += earnedPoints;
                    lp.UpdatedDate = DateTime.UtcNow;
                }
            }

            // Thông báo thanh toán thành công
            _context.Notifications.Add(new Notification
            {
                Title = "Thanh toán thành công",
                Message = $"Hóa đơn #{order.Id} trị giá {total:N0}đ đã được thanh toán. Khách hàng nhận được {earnedPoints} điểm thưởng.",
                CreatedDate = DateTime.UtcNow,
                UserId = 1
            });

            await _context.SaveChangesAsync();

            return CreatedAtAction("GetOrder", new { id = order.Id }, order);
        }
        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> DeleteOrder(int id)
        {
            var order = await _context.Orders
                .Include(o => o.OrderDetails)
                .FirstOrDefaultAsync(o => o.Id == id);

            if (order == null) return NotFound();

            // Reverse inventory for products in order
            foreach (var od in order.OrderDetails)
            {
                if (od.ProductId != null)
                {
                    var product = await _context.Products.FindAsync(od.ProductId);
                    if (product != null)
                    {
                        product.StockQuantity += od.Quantity;
                    }
                }
            }

            _context.Orders.Remove(order);
            await _context.SaveChangesAsync();
            return NoContent();
        }
    }
}
