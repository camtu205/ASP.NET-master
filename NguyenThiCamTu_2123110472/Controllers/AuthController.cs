using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using NguyenThiCamTu_2123110472.Data;
using NguyenThiCamTu_2123110472.Models;

namespace NguyenThiCamTu_2123110472.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IConfiguration _configuration;

        public AuthController(AppDbContext context, IConfiguration configuration)
        {
            _context = context;
            _configuration = configuration;
        }

        public class RegisterRequest
        {
            public string Username { get; set; } = string.Empty;
            public string Password { get; set; } = string.Empty;
            public string Role { get; set; } = "Customer"; // Default to Customer
            public string? FullName { get; set; }
            public string? PhoneNumber { get; set; }
            public string? Email { get; set; }
            public string? Address { get; set; }
        }

        public class LoginRequest
        {
            public string Username { get; set; } = string.Empty;
            public string Password { get; set; } = string.Empty;
        }

        [HttpPost("Register")]
        public async Task<IActionResult> Register([FromBody] RegisterRequest request)
        {
            try {
                // 1. Kiểm tra Username tồn tại
                if (await _context.Users.AnyAsync(u => u.Username == request.Username))
                {
                    return BadRequest("Tên đăng nhập đã tồn tại.");
                }

                // Tạm thời chỉ lưu thông tin cốt lõi để test lỗi Database
                var user = new User
                {
                    Username = request.Username,
                    PasswordHash = HashPassword(request.Password),
                    Role = "Customer"
                };

                _context.Users.Add(user);
                await _context.SaveChangesAsync();

                return Ok(new { Message = "Đăng ký thành công! (Bản rút gọn)" });
            }
            catch (Exception ex)
            {
                // Trả về lỗi chi tiết để debug
                return StatusCode(500, $"Lỗi hệ thống: {ex.Message}");
            }
        }

        [HttpPost("Login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest request)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Username == request.Username);
            
            if (user == null || user.PasswordHash != HashPassword(request.Password))
            {
                // Fallback for the dummy admin seeded in DbContext which might not be hashed
                if (user != null && user.Username == "admin" && user.PasswordHash == "admin" && request.Password == "admin")
                {
                    // allow admin login from seeded data
                }
                else
                {
                    return Unauthorized("Invalid credentials.");
                }
            }

            var token = GenerateJwtToken(user);

            return Ok(new 
            { 
                Token = token, 
                Message = "Login successful",
                User = new {
                    user.Id,
                    user.Username,
                    user.Role,
                    user.FullName,
                    user.PhoneNumber,
                    user.Email,
                    user.Address
                }
            });
        }

        [HttpPost("Logout")]
        public IActionResult Logout()
        {
            // Stateless JWT cannot be invalidated server-side without a blacklist.
            // Best practice is instructing the client to delete the token.
            return Ok(new { Message = "Logged out successfully. Please delete your local token." });
        }

        private string HashPassword(string password)
        {
            using (var sha256 = SHA256.Create())
            {
                var hashedBytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(password));
                return Convert.ToBase64String(hashedBytes);
            }
        }

        private string GenerateJwtToken(User user)
        {
            var jwtSettings = _configuration.GetSection("Jwt");
            var key = new SymmetricSecurityKey(Encoding.ASCII.GetBytes(jwtSettings["Key"] ?? "SecretKeyVeryLong12345!"));
            var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var claims = new[]
            {
                new Claim(JwtRegisteredClaimNames.Sub, user.Username),
                new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
                new Claim("UserId", user.Id.ToString()),
                new Claim(ClaimTypes.Role, user.Role), // Dùng ClaimTypes.Role để dễ dùng [Authorize(Roles="Admin")]
                new Claim(ClaimTypes.Name, user.Username)
            };

            var token = new JwtSecurityToken(
                issuer: jwtSettings["Issuer"],
                audience: jwtSettings["Audience"],
                claims: claims,
                expires: DateTime.UtcNow.AddHours(2),
                signingCredentials: credentials);

            return new JwtSecurityTokenHandler().WriteToken(token);
        }
    }
}
