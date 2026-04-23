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

        [HttpGet("MyOrders")]
        public async Task<ActionResult<IEnumerable<Order>>> GetMyOrders(int customerId)
        {
            return await _context.Orders
                .Where(o => o.CustomerId == customerId)
                .Include(o => o.OrderDetails)
                    .ThenInclude(od => od.Service)
                .Include(o => o.OrderDetails)
                    .ThenInclude(od => od.Product)
                .OrderByDescending(o => o.OrderDate)
                .ToListAsync();
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

            if (appointment != null)
            {
                foreach (var appDetail in appointment.AppointmentDetails)
                {
                    var od = new OrderDetail
                    {
                        ServiceId = appDetail.ServiceId,
                        Quantity = 1,
                        Price = appDetail.Price * multiplier
                    };
                    order.OrderDetails.Add(od);
                    total += od.Price * od.Quantity;
                }
                if (appointment.Status != "Done") appointment.Status = "Done";
            }

            foreach (var sId in request.ServiceIds)
            {
                var service = await _context.Services.FindAsync(sId);
                if (service != null)
                {
                    var od = new OrderDetail
                    {
                        ServiceId = service.Id,
                        Quantity = 1,
                        Price = service.Price * multiplier
                    };
                    order.OrderDetails.Add(od);
                    total += od.Price * od.Quantity;
                }
            }

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
                    product.StockQuantity -= 1;
                }
            }

            if (request.PromotionId.HasValue)
            {
                var promo = await _context.Promotions.Include(p => p.Orders).FirstOrDefaultAsync(p => p.Id == request.PromotionId.Value);
                if (promo != null && promo.StartDate <= DateTime.Now && promo.EndDate >= DateTime.Now)
                {
                    if (!promo.MaxUsage.HasValue || promo.Orders.Count < promo.MaxUsage.Value)
                    {
                        decimal discountableAmount = 0;
                        var appIds = (promo.ApplicableServiceIds ?? "ALL").ToUpper();
                        foreach (var od in order.OrderDetails)
                        {
                            if (od.ServiceId.HasValue && (appIds == "ALL" || appIds.Contains($",{od.ServiceId},")))
                                discountableAmount += od.Price * od.Quantity;
                        }
                        if (discountableAmount > 0) total -= discountableAmount * (promo.DiscountPercent / 100);
                    }
                }
            }

            var customerForRank = await _context.Customers.FindAsync(customerId);
            if (customerForRank != null)
            {
                decimal rankDiscountPct = customerForRank.Rank switch { "Silver" => 0.05m, "Gold" => 0.10m, "Platinum" => 0.15m, _ => 0m };
                if (rankDiscountPct > 0) total -= total * rankDiscountPct;
            }

            order.TotalAmount = total;
            var payment = new Payment { PaymentMethod = request.PaymentMethod, Amount = total, PaymentDate = DateTime.Now, Status = request.PaymentMethod == "VNPAY" ? "Pending" : "Completed" };
            order.Payments.Add(payment);
            _context.Orders.Add(order);
            await _context.SaveChangesAsync();

            string? paymentUrl = null;
            if (request.PaymentMethod == "VNPAY")
            {
                paymentUrl = _vnpayService.CreatePaymentUrl(HttpContext, new PaymentInformationModel {
                    OrderId = order.Id, Amount = (double)total, OrderDescription = $"Thanh toan don hang #{order.Id}", OrderType = "order"
                });
            }

            int earnedPoints = (int)(total / 100000);
            if (earnedPoints > 0)
            {
                var lp = await _context.LoyaltyPoints.FirstOrDefaultAsync(x => x.CustomerId == customerId);
                if (lp == null) _context.LoyaltyPoints.Add(new LoyaltyPoint { CustomerId = customerId, Points = earnedPoints, UpdatedDate = DateTime.UtcNow });
                else { lp.Points += earnedPoints; lp.UpdatedDate = DateTime.UtcNow; }
                var cust = await _context.Customers.FindAsync(customerId);
                if (cust != null) cust.Rank = lp?.Points >= 5000 ? "Platinum" : lp?.Points >= 2000 ? "Gold" : lp?.Points >= 500 ? "Silver" : "Standard";
            }

            _context.Notifications.Add(new Notification { Title = "Thanh toán thành công", Message = $"Hóa đơn #{order.Id} trị giá {total:N0}đ đã được thanh toán.", CreatedDate = DateTime.UtcNow, UserId = 1, TargetType = "Order", TargetId = order.Id });
            var customer = await _context.Customers.FindAsync(customerId);
            await AppDbContext.CreateNotification(_context, "Đơn hàng mới", $"Khách hàng {customer?.FullName} đã thanh toán đơn #{order.Id}.", 1, "Order", order.Id);
            return Ok(new { order, paymentUrl });
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> DeleteOrder(int id)
        {
            var order = await _context.Orders.Include(o => o.OrderDetails).FirstOrDefaultAsync(o => o.Id == id);
            if (order == null) return NotFound();
            foreach (var od in order.OrderDetails) if (od.ProductId != null) { var product = await _context.Products.FindAsync(od.ProductId); if (product != null) product.StockQuantity += od.Quantity; }
            _context.Orders.Remove(order);
            await _context.SaveChangesAsync();
            return NoContent();
        }
    }
}
