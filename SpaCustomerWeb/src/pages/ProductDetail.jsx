import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShoppingBag, ArrowLeft, Star, ShieldCheck, Truck, RefreshCw, Loader2 } from 'lucide-react';
import { api, getImageUrl } from '../services/api';
import { useCart } from '../context/CartContext';
import { toast } from 'react-hot-toast';

const ProductDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { addToCart } = useCart();
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [quantity, setQuantity] = useState(1);

    useEffect(() => {
        const fetchProduct = async () => {
            try {
                const data = await api.get(`/Product/${id}`);
                setProduct(data);
            } catch (err) {
                toast.error("Không thể tải thông tin sản phẩm");
                navigate('/products');
            } finally {
                setLoading(false);
            }
        };
        fetchProduct();
    }, [id, navigate]);

    const handleAddToCart = () => {
        addToCart(product, quantity);
        toast.success(`Đã thêm ${quantity} ${product.name} vào giỏ hàng`);
    };

    const handleBuyNow = () => {
        addToCart(product, quantity);
        navigate('/checkout-product');
    };

    if (loading) return (
        <div className="pt-40 flex items-center justify-center min-h-[60vh]">
            <Loader2 className="animate-spin text-[#064e3b]" size={48} />
        </div>
    );

    if (!product) return null;

    return (
        <div className="pt-32 pb-20 container mx-auto px-4">
            <button 
                onClick={() => navigate(-1)}
                className="flex items-center gap-2 text-gray-500 hover:text-pink-500 transition-colors mb-8"
            >
                <ArrowLeft size={20} /> Quay lại
            </button>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
                {/* Image Section */}
                <motion.div 
                    initial={{ opacity: 0, x: -50 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="rounded-[3rem] overflow-hidden bg-white shadow-2xl aspect-square"
                >
                    <img 
                        src={getImageUrl(product.imageUrl)} 
                        alt={product.name} 
                        className="w-full h-full object-cover"
                    />
                </motion.div>

                {/* Info Section */}
                <motion.div 
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex flex-col"
                >
                    <span className="text-[#d4af37] font-bold tracking-widest text-xs uppercase mb-4">Sản phẩm cao cấp</span>
                    <h1 className="text-4xl md:text-5xl font-serif mb-4 leading-tight">{product.name}</h1>
                    
                    <div className="flex items-center gap-4 mb-6">
                        <div className="flex text-[#d4af37]">
                            {[...Array(5)].map((_, i) => <Star key={i} size={18} fill="currentColor" />)}
                        </div>
                        <span className="text-gray-400 text-sm border-l pl-4 border-gray-200">(120+ Đánh giá)</span>
                    </div>

                    <div className="text-3xl font-bold text-[#064e3b] mb-8">
                        {product.price?.toLocaleString()}đ
                    </div>

                    <p className="text-gray-600 mb-8 leading-relaxed">
                        Sản phẩm chiết xuất từ thiên nhiên, an toàn cho mọi loại da. Giúp tái tạo và nuôi dưỡng làn da khỏe mạnh từ sâu bên trong. Mang lại cảm giác thư giãn như đang được chăm sóc tại Spa.
                    </p>

                    <div className="bg-pink-50/50 p-6 rounded-2xl mb-8 border border-pink-100/50">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm text-pink-500">
                                <ShieldCheck size={20} />
                            </div>
                            <div>
                                <h4 className="font-bold text-sm">Cam kết chất lượng</h4>
                                <p className="text-xs text-gray-500">Sản phẩm chính hãng 100%</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm text-pink-500">
                                <Truck size={20} />
                            </div>
                            <div>
                                <h4 className="font-bold text-sm">Giao hàng tận nơi</h4>
                                <p className="text-xs text-gray-500">Miễn phí vận chuyển cho đơn trên 500k</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-4 bg-gray-100 p-2 rounded-2xl w-fit mb-4">
                            <button 
                                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm hover:bg-pink-500 hover:text-white transition-all"
                            >-</button>
                            <span className="w-12 text-center font-bold">{quantity}</span>
                            <button 
                                onClick={() => setQuantity(quantity + 1)}
                                className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm hover:bg-pink-500 hover:text-white transition-all"
                            >+</button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <button 
                                onClick={handleAddToCart}
                                className="btn-secondary w-full justify-center py-4 rounded-2xl border-2 border-pink-500 text-pink-500"
                            >
                                <ShoppingBag size={20} /> Thêm vào giỏ
                            </button>
                            <button 
                                onClick={handleBuyNow}
                                className="btn-primary w-full justify-center py-4 rounded-2xl"
                            >
                                Mua ngay
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default ProductDetail;
