import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShoppingBag, Truck, CreditCard, MapPin, User, Phone, ChevronRight } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { api } from '../services/api';
import { toast } from 'react-hot-toast';

const ProductCheckout = () => {
    const { cartItems, getCartTotal, clearCart } = useCart();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        fullName: '',
        phoneNumber: '',
        address: '',
        note: ''
    });

    const subtotal = getCartTotal();
    const shippingFee = subtotal >= 500000 ? 0 : 30000;
    const total = subtotal + shippingFee;

    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (cartItems.length === 0) return toast.error("Giỏ hàng đang trống");

        setLoading(true);
        try {
            // 1. Create Order on Backend
            const orderPayload = {
                customerId: 0, // Will be determined by token on backend or we fetch customer profile first
                totalAmount: total,
                orderDetails: cartItems.map(item => ({
                    productId: item.id,
                    quantity: item.quantity,
                    price: item.price
                }))
            };

            // Fetch current customer profile to get ID
            const profileRes = await api.get('/Auth/Profile');
            const customerRes = await api.get('/Customers');
            const customer = customerRes.data.find(c => c.username === profileRes.data.username);
            
            if (!customer) throw new Error("Vui lòng đăng nhập để mua hàng");

            orderPayload.customerId = customer.id;

            const response = await api.post('/Orders', orderPayload);
            const orderId = response.data.id;

            // 2. Initiate Payment (VNPay)
            const paymentRes = await api.post(`/Payment/CreateProductPayment/${orderId}`, {
                amount: total,
                orderInfo: `Thanh toan don hang #${orderId} - Spa Boutique`
            });

            if (paymentRes.data.paymentUrl) {
                clearCart();
                window.location.href = paymentRes.data.paymentUrl;
            } else {
                toast.success("Đặt hàng thành công!");
                clearCart();
                navigate('/booking-history');
            }
        } catch (err) {
            toast.error(err.response?.data || "Lỗi khi xử lý đơn hàng");
        } finally {
            setLoading(false);
        }
    };

    if (cartItems.length === 0) return (
        <div className="pt-40 pb-20 container text-center">
            <ShoppingBag size={64} className="mx-auto text-gray-200 mb-6" />
            <h2 className="text-3xl font-serif mb-4">Giỏ hàng của bạn đang trống</h2>
            <button onClick={() => navigate('/products')} className="btn-primary">Quay lại cửa hàng</button>
        </div>
    );

    return (
        <div className="pt-32 pb-20 container mx-auto px-4">
            <h1 className="text-4xl font-serif mb-12 text-center">Thanh toán đơn hàng</h1>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
                {/* Form Section */}
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass p-8 rounded-[2.5rem]"
                >
                    <h2 className="text-2xl font-serif mb-8 flex items-center gap-3">
                        <MapPin className="text-pink-500" /> Thông tin nhận hàng
                    </h2>
                    
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-600 flex items-center gap-2">
                                <User size={16} /> Họ và tên người nhận
                            </label>
                            <input 
                                type="text" name="fullName" required 
                                value={formData.fullName} onChange={handleInputChange}
                                className="w-full px-6 py-4 rounded-2xl bg-white border border-gray-100 focus:ring-2 focus:ring-pink-500 outline-none transition-all shadow-sm"
                                placeholder="Nguyễn Văn A"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-600 flex items-center gap-2">
                                <Phone size={16} /> Số điện thoại
                            </label>
                            <input 
                                type="tel" name="phoneNumber" required 
                                value={formData.phoneNumber} onChange={handleInputChange}
                                className="w-full px-6 py-4 rounded-2xl bg-white border border-gray-100 focus:ring-2 focus:ring-pink-500 outline-none transition-all shadow-sm"
                                placeholder="090 123 4567"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-600 flex items-center gap-2">
                                <MapPin size={16} /> Địa chỉ giao hàng
                            </label>
                            <textarea 
                                name="address" required 
                                value={formData.address} onChange={handleInputChange}
                                className="w-full px-6 py-4 rounded-2xl bg-white border border-gray-100 focus:ring-2 focus:ring-pink-500 outline-none transition-all shadow-sm min-h-[100px]"
                                placeholder="Số nhà, tên đường, Phường/Xã, Quận/Huyện, Tỉnh/Thành phố"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-600">Ghi chú (Tùy chọn)</label>
                            <input 
                                type="text" name="note" 
                                value={formData.note} onChange={handleInputChange}
                                className="w-full px-6 py-4 rounded-2xl bg-white border border-gray-100 focus:ring-2 focus:ring-pink-500 outline-none transition-all shadow-sm"
                                placeholder="Ví dụ: Giao vào giờ hành chính"
                            />
                        </div>

                        <div className="pt-4">
                            <button 
                                type="submit" disabled={loading}
                                className="btn-primary w-full justify-center py-5 rounded-2xl text-lg shadow-xl shadow-pink-200"
                            >
                                {loading ? "Đang xử lý..." : `Thanh toán ${total.toLocaleString()}đ`}
                                {!loading && <ChevronRight className="ml-2" />}
                            </button>
                        </div>
                    </form>
                </motion.div>

                {/* Summary Section */}
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    <div className="glass p-8 rounded-[2.5rem] mb-6">
                        <h2 className="text-2xl font-serif mb-8 flex items-center gap-3">
                            <ShoppingBag className="text-pink-500" /> Tóm tắt đơn hàng
                        </h2>
                        
                        <div className="space-y-6 mb-8 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                            {cartItems.map(item => (
                                <div key={item.id} className="flex gap-4 items-center">
                                    <img src={item.imageUrl || "https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&q=80&w=100"} alt={item.name} className="w-20 h-20 rounded-2xl object-cover border border-gray-100" />
                                    <div className="flex-1">
                                        <h4 className="font-bold text-gray-800">{item.name}</h4>
                                        <p className="text-sm text-gray-500">Số lượng: {item.quantity}</p>
                                    </div>
                                    <div className="font-bold text-[#064e3b]">
                                        {(item.price * item.quantity).toLocaleString()}đ
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="space-y-4 pt-6 border-top border-gray-100">
                            <div className="flex justify-between text-gray-600">
                                <span>Tạm tính</span>
                                <span className="font-medium">{subtotal.toLocaleString()}đ</span>
                            </div>
                            <div className="flex justify-between text-gray-600 items-center">
                                <span className="flex items-center gap-2"><Truck size={16} /> Phí vận chuyển</span>
                                <span className={shippingFee === 0 ? "text-green-500 font-bold" : "font-medium"}>
                                    {shippingFee === 0 ? "Miễn phí" : `${shippingFee.toLocaleString()}đ`}
                                </span>
                            </div>
                            {shippingFee > 0 && (
                                <p className="text-[10px] text-gray-400 text-right italic">* Miễn phí vận chuyển cho đơn hàng trên 500.000đ</p>
                            )}
                            <div className="flex justify-between text-2xl font-serif pt-4 border-t border-gray-200">
                                <span>Tổng cộng</span>
                                <span className="text-[#064e3b] font-bold">{total.toLocaleString()}đ</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-[#064e3b] text-white p-6 rounded-[2rem] flex items-center gap-4">
                        <div className="bg-white/20 p-3 rounded-full">
                            <CreditCard size={24} />
                        </div>
                        <div>
                            <h4 className="font-bold">Thanh toán an toàn</h4>
                            <p className="text-xs text-white/70">Hệ thống thanh toán VNPay bảo mật tuyệt đối</p>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default ProductCheckout;
