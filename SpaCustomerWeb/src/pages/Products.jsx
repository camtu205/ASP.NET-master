import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ShoppingBag, Star, Loader2, AlertCircle } from 'lucide-react';
import { getProducts } from '../services/api';

const Products = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
            <h1 className="text-5xl font-serif mb-6">Boutique</h1>
            <p className="text-[#475569] max-w-2xl mx-auto">Bring the spa experience home with our curated collection of organic products.</p>
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
                <div className="relative overflow-hidden rounded-[2.5rem] bg-white shadow-xl mb-8 aspect-[4/5] border border-gray-100">
                  <img src={product.imageUrl || "https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&q=80&w=400"} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000" />
                  <div className="absolute inset-0 bg-black/10 group-hover:bg-black/30 transition-all duration-500 opacity-0 group-hover:opacity-100 flex items-end justify-center pb-8 p-4">
                    <button className="btn-primary w-full justify-center transform translate-y-4 group-hover:translate-y-0 transition-all duration-500 shadow-2xl">
                      <ShoppingBag size={18} />
                      Add to Basket
                    </button>
                  </div>
                </div>
                <div className="text-center px-2">
                  <span className="text-xs uppercase tracking-widest text-[#d4af37] font-bold mb-3 block">{product.stockQuantity > 0 ? 'In Stock' : 'Out of Stock'}</span>
                  <h3 className="text-xl font-serif mb-3 leading-tight font-medium">{product.name}</h3>
                  <div className="flex items-center justify-center gap-1.5 mb-3 text-[#d4af37]">
                    {[...Array(5)].map((_, i) => <Star key={i} size={14} fill="currentColor" />)}
                  </div>
                  <p className="text-[#064e3b] font-bold text-xl">${product.price}</p>
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
