import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ShoppingBag, Star, Loader2, AlertCircle } from 'lucide-react';
import { getProducts, getImageUrl } from '../services/api';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { toast } from 'react-hot-toast';

const Products = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { addToCart } = useCart();

  const handleQuickAdd = (e, product) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart(product, 1);
    toast.success(`Đã thêm ${product.name} vào giỏ hàng`);
  };

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const data = await getProducts();
        setProducts(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  if (loading) return (
    <div className="pt-40 flex items-center justify-center min-h-[60vh]">
      <Loader2 className="animate-spin text-[#064e3b]" size={48} />
    </div>
  );

  if (error) return (
    <div className="pt-40 container text-center">
      <div className="glass p-10 rounded-3xl border-red-100 mx-auto max-w-lg">
        <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
        <h2 className="text-2xl font-serif mb-2">Failed to Load Products</h2>
        <p className="text-red-600 mb-6">{error}</p>
        <button onClick={() => window.location.reload()} className="btn-primary">Try Again</button>
      </div>
    </div>
  );

  return (
    <div className="products-page pt-24 pb-20">
      <section className="section-padding">
        <div className="container">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center mb-16"
          >
            <h1 className="text-5xl font-serif mb-6">Spa Boutique</h1>
            <p className="text-[#475569] max-w-2xl mx-auto">Nâng tầm trải nghiệm spa tại nhà với bộ sưu tập sản phẩm hữu cơ cao cấp của chúng tôi.</p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((product, idx) => (
              <motion.div 
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.03 }}
                className="group bg-white rounded-3xl p-3 shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 flex flex-col"
              >
                {/* Image Section */}
                <div className="relative overflow-hidden rounded-2xl aspect-square mb-4 bg-gray-50">
                  <Link to={`/product/${product.id}`} className="block w-full h-full">
                    <img 
                      src={getImageUrl(product.imageUrl)} 
                      alt={product.name} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
                    />
                  </Link>
                  {product.stockQuantity === 0 && (
                    <div className="absolute inset-0 bg-white/40 backdrop-blur-sm flex items-center justify-center">
                      <span className="bg-red-500 text-white text-[10px] px-3 py-1 rounded-full font-bold uppercase">Hết hàng</span>
                    </div>
                  )}
                </div>

                {/* Info Section */}
                <div className="flex-1 px-1">
                  <Link to={`/product/${product.id}`}>
                    <h3 className="text-sm font-bold text-gray-800 line-clamp-2 h-10 mb-1 hover:text-[#064e3b]">
                      {product.name}
                    </h3>
                  </Link>
                  <p className="text-[#064e3b] font-bold text-base mb-3">
                    {product.price?.toLocaleString()}đ
                  </p>

                  {/* Actions - Clearly defined small buttons */}
                  <div className="flex gap-2">
                    <button 
                      onClick={(e) => handleQuickAdd(e, product)}
                      disabled={product.stockQuantity === 0}
                      className="flex-1 bg-gray-100 hover:bg-gray-200 text-[#064e3b] py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1"
                    >
                      <ShoppingBag size={14} />
                      Thêm
                    </button>
                    <button 
                      onClick={(e) => {
                        e.preventDefault();
                        addToCart(product, 1);
                        window.location.href = '/checkout-product';
                      }}
                      disabled={product.stockQuantity === 0}
                      className="flex-1 bg-[#064e3b] hover:bg-[#053e2f] text-white py-2 rounded-xl text-xs font-bold transition-all"
                    >
                      Mua ngay
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Products;
