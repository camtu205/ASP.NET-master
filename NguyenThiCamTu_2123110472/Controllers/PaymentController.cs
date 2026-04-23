using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NguyenThiCamTu_2123110472.Data;
using NguyenThiCamTu_2123110472.Models;
using NguyenThiCamTu_2123110472.Services;
using System.Web;

namespace NguyenThiCamTu_2123110472.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class PaymentController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly VnPayService _vnpayService;

        public class VnPayCallbackDto
        {
            public string vnp_Amount { get; set; }
            public string vnp_BankCode { get; set; }
            public string vnp_BankTranNo { get; set; }
            public string vnp_CardType { get; set; }
            public string vnp_OrderInfo { get; set; }
            public string vnp_PayDate { get; set; }
            public string vnp_ResponseCode { get; set; }
            public string vnp_TmnCode { get; set; }
            public string vnp_TransactionNo { get; set; }
            public string vnp_TransactionStatus { get; set; }
            public string vnp_TxnRef { get; set; }
            public string vnp_SecureHash { get; set; }
        }

        [HttpPost("CreateProductPayment/{orderId}")]
        public async Task<IActionResult> CreateProductPayment(int orderId)
        {
            var order = await _context.Orders
                .Include(o => o.Customer)
                .FirstOrDefaultAsync(o => o.Id == orderId);

            if (order == null) return NotFound("Không tìm thấy đơn hàng");

            // Create Payment record
            var payment = new Payment
            {
                OrderId = orderId,
                Amount = order.TotalAmount,
                PaymentDate = DateTime.Now,
                PaymentMethod = "VNPay",
                Status = "Pending"
            };
            _context.Payments.Add(payment);
            await _context.SaveChangesAsync();

            var paymentUrl = _vnpayService.CreatePaymentUrl(HttpContext, new PaymentInformationModel
            {
                Amount = (double)order.TotalAmount,
                OrderDescription = $"Thanh toan don hang #{orderId} - Spa Boutique",
                OrderType = "product",
                OrderId = orderId
            });

            return Ok(new { paymentUrl });
        }

        [HttpGet("VnPayReturn")]
        public async Task<IActionResult> VnPayReturn()
        {
            var query = Request.Query;
            string vnp_ResponseCode = query["vnp_ResponseCode"];
            string vnp_TxnRef = query["vnp_TxnRef"];
            string vnp_TransactionStatus = query["vnp_TransactionStatus"];

            if (vnp_ResponseCode == "00" && vnp_TransactionStatus == "00")
            {
                // Payment Success
                int orderId = int.Parse(vnp_TxnRef);
                var payment = await _context.Payments.FirstOrDefaultAsync(p => p.OrderId == orderId && p.Status == "Pending");
                if (payment != null)
                {
                    payment.Status = "Completed";
                    
                    var order = await _context.Orders.FindAsync(orderId);
                    if (order != null) {
                        // Notify success
                        _context.Notifications.Add(new Notification {
                            Title = "Thanh toán thành công",
                            Message = $"Hóa đơn #{orderId} đã được thanh toán qua VNPay.",
                            CreatedDate = DateTime.UtcNow,
                            UserId = 1
                        });
                    }
                    
                    await _context.SaveChangesAsync();
                    return Redirect("https://asp-net-master.vercel.app/payment-status?status=success&orderId=" + orderId);
                }
            }

            return Redirect("https://asp-net-master.vercel.app/payment-status?status=fail");
        }
    }
}
