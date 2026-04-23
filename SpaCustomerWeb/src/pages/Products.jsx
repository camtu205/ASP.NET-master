import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ShoppingBag, Star, Loader2, AlertCircle } from 'lucide-react';
import { getProducts } from '../services/api';
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

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
            {products.map((product, idx) => (
              <motion.div 
                key={product.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="group flex flex-col"
              >
                <div className="relative group overflow-hidden rounded-[2.5rem] bg-white shadow-xl mb-6 aspect-[4/5] border border-gray-100">
                  <Link to={`/product/${product.id}`} className="block w-full h-full">
                    <img src={product.imageUrl || "https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&q=80&w=400"} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000" />
                  </Link>
                  
                  {/* Small cart button in corner */}
                  <button 
                    onClick={(e) => handleQuickAdd(e, product)}
                    className="absolute top-4 right-4 w-12 h-12 bg-white/90 backdrop-blur-md rounded-full flex items-center justify-center text-[#064e3b] shadow-lg hover:bg-pink-500 hover:text-white transition-all duration-300 transform translate-y-[-10px] opacity-0 group-hover:translate-y-0 group-hover:opacity-100 z-10"
                    title="Thêm vào giỏ"
                  >
                    <ShoppingBag size={20} />
                  </button>

                  <div className="absolute bottom-4 left-4 right-4 pointer-events-none">
                    <div className="bg-white/80 backdrop-blur-sm px-4 py-2 rounded-2xl inline-block text-[10px] font-bold uppercase tracking-widest text-[#d4af37]">
                        {product.stockQuantity > 0 ? 'Còn hàng' : 'Hết hàng'}
                    </div>
                  </div>
                </div>

                <div className="text-center px-2">
                  <Link to={`/product/${product.id}`}>
                    <h3 className="text-lg font-serif mb-2 leading-tight font-medium hover:text-pink-500 transition-colors h-14 line-clamp-2">{product.name}</h3>
                  </Link>
                  <div className="flex items-center justify-center gap-1 mb-2 text-[#d4af37]">
                    {[...Array(5)].map((_, i) => <Star key={i} size={12} fill="currentColor" />)}
                  </div>
                  <p className="text-[#064e3b] font-bold text-lg">{product.price?.toLocaleString()}đ</p>
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
