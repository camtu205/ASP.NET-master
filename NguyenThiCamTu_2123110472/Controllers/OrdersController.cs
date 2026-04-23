using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NguyenThiCamTu_2123110472.Data;
using NguyenThiCamTu_2123110472.Models;
using NguyenThiCamTu_2123110472.Services;

namespace NguyenThiCamTu_2123110472.Controllers
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class OrdersController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly VnPayService _vnpayService;

        public OrdersController(AppDbContext context, VnPayService vnpayService)
        {
            _context = context;
            _vnpayService = vnpayService;
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
            public int? AppointmentId { get; set; }
            public int? CustomerId { get; set; }
            public int? RoomTypeId { get; set; }
            public List<int> ServiceIds { get; set; } = new List<int>();
            public List<int> ProductIds { get; set; } = new List<int>();
            public int? PromotionId { get; set; }
            public string PaymentMethod { get; set; } = "Tiền mặt";
        }

        [HttpPost("Checkout")]
        public async Task<ActionResult<Order>> Checkout([FromBody] CheckoutRequest request)
        {
            var appointment = await _context.Appointments
                .Include(a => a.AppointmentDetails)
                .Include(a => a.Bed)
                    .ThenInclude(b => b!.Room)
                        .ThenInclude(r => r!.RoomType)
                .FirstOrDefaultAsync(a => a.Id == request.AppointmentId);

            // Get Customer ID
            int customerId = 0;
            if (appointment != null) customerId = appointment.CustomerId;
            else if (request.CustomerId.HasValue) customerId = request.CustomerId.Value;
            else return BadRequest("Customer ID is required.");

            var order = new Order
            {
                CustomerId = customerId,
                AppointmentId = appointment?.Id,
                PromotionId = request.PromotionId,
                OrderDate = DateTime.Now,
                TotalAmount = 0
            };

            // 1. Determine Room Type Multiplier
            decimal multiplier = 1.0m;
            if (appointment?.Bed?.Room?.RoomType != null)
            {
                multiplier = appointment.Bed.Room.RoomType.PriceMultiplier;
            }
            else if (request.RoomTypeId.HasValue)
            {
                var rt = await _context.RoomTypes.FindAsync(request.RoomTypeId.Value);
                if (rt != null) multiplier = rt.PriceMultiplier;
            }

            decimal total = 0;

            // 2. Add services from appointment (if any)
            if (appointment != null)
            {
                foreach (var appDetail in appointment.AppointmentDetails)
                {
                    var od = new OrderDetail
                    {
                        ServiceId = appDetail.ServiceId,
                        Quantity = 1,
                        Price = appDetail.Price * multiplier // Apply multiplier here
                    };
                    order.OrderDetails.Add(od);
                    total += od.Price * od.Quantity;
                }
                if (appointment.Status != "Done") appointment.Status = "Done";
            }

            // 3. Add services selected manually
            foreach (var sId in request.ServiceIds)
            {
                var service = await _context.Services.FindAsync(sId);
                if (service != null)
                {
                    var od = new OrderDetail
                    {
                        ServiceId = service.Id,
                        Quantity = 1,
                        Price = service.Price * multiplier // Apply multiplier here
                    };
                    order.OrderDetails.Add(od);
                    total += od.Price * od.Quantity;
                }
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
                    if (promo.MaxUsage.HasValue && promo.Orders.Count >= promo.MaxUsage.Value)
                    {
                        return BadRequest("Khuyến mãi đã hết lượt sử dụng.");
                    }

                    decimal discountableAmount = 0;
                    var appIds = (promo.ApplicableServiceIds ?? "ALL").ToUpper();

                    foreach (var od in order.OrderDetails)
                    {
                        if (od.ServiceId.HasValue)
                        {
                            bool isApplicable = appIds == "ALL" || appIds.Contains($",{od.ServiceId},");
                            if (isApplicable) discountableAmount += od.Price * od.Quantity;
                        }
                    }

                    if (discountableAmount > 0)
                    {
                        decimal discount = discountableAmount * (promo.DiscountPercent / 100);
                        total -= discount;
                    }
                }
            }

            // 4. Apply Rank Discount
            var customerForRank = await _context.Customers.FindAsync(customerId);
            if (customerForRank != null)
            {
                decimal rankDiscountPct = 0;
                if (customerForRank.Rank == "Silver") rankDiscountPct = 0.05m;
                else if (customerForRank.Rank == "Gold") rankDiscountPct = 0.10m;
                else if (customerForRank.Rank == "Platinum") rankDiscountPct = 0.15m;

                if (rankDiscountPct > 0)
                {
                    total -= total * rankDiscountPct;
                }
            }

            order.TotalAmount = total;
            
            // Add Payment record
            var payment = new Payment
            {
                PaymentMethod = request.PaymentMethod,
                Amount = total,
                PaymentDate = DateTime.Now,
                Status = request.PaymentMethod == "VNPAY" ? "Pending" : "Completed"
            };
            order.Payments.Add(payment);
            
            _context.Orders.Add(order);
            await _context.SaveChangesAsync();

            string? paymentUrl = null;
            if (request.PaymentMethod == "VNPAY")
            {
                var ipAddr = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "127.0.0.1";
                paymentUrl = _vnpayService.CreatePaymentUrl(order.Id, total, ipAddr, $"Thanh toan don hang #{order.Id}");
            }

            // Quy đổi điểm thưởng: 100,000đ = 1 điểm
            int earnedPoints = (int)(total / 100000);
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

                // Cập nhật Rank dựa trên điểm tích lũy
                var cust = await _context.Customers.FindAsync(order.CustomerId);
                if (cust != null)
                {
                    if (lp.Points >= 5000) cust.Rank = "Platinum";
                    else if (lp.Points >= 2000) cust.Rank = "Gold";
                    else if (lp.Points >= 500) cust.Rank = "Silver";
                    else cust.Rank = "Standard";
                }
            }

            // Thông báo thanh toán thành công
            _context.Notifications.Add(new Notification
            {
                Title = "Thanh toán thành công",
                Message = $"Hóa đơn #{order.Id} trị giá {total:N0}đ đã được thanh toán. Khách hàng nhận được {earnedPoints} điểm thưởng.",
                CreatedDate = DateTime.UtcNow,
                UserId = 1,
                TargetType = "Order",
                TargetId = order.Id
            });

            // Notify Admin
            var customer = await _context.Customers.FindAsync(customerId);
            await AppDbContext.CreateNotification(_context, "Đơn hàng mới", $"Khách hàng {customer?.FullName} đã thanh toán đơn #{order.Id}: {total:N0}đ.", 1, "Order", order.Id);
            return Ok(new { order, paymentUrl });
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
