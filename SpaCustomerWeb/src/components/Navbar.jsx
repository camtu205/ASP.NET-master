import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, User, Calendar, ShoppingBag } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCart } from '../context/CartContext';
import { getImageUrl } from '../services/api';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  
  const { cartItems } = useCart();
  const location = useLocation();
  
  const cartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);
  const cartTotal = cartItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);

  useEffect(() => {
    setIsOpen(false);
    setIsCartOpen(false);
    
    // Check for logged in user info
    const savedUser = localStorage.getItem('spa_user');
    if (savedUser) {
      try {
        setCurrentUser(JSON.parse(savedUser));
      } catch (e) {
        console.error("Failed to parse user data", e);
      }
    }

    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [location.pathname]);

  const handleLogout = () => {
    localStorage.removeItem('spa_token');
    localStorage.removeItem('spa_user');
    setCurrentUser(null);
    window.location.href = '/login';
  };

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'Services', path: '/services' },
    { name: 'Products', path: '/products' },
    { name: 'History', path: '/history' },
    { name: 'Notifications', path: '/notifications' },
    { name: 'Profile', path: '/profile' },
  ];

  return (
    <>
      <nav className={`fixed w-full z-50 transition-all duration-500 ${isScrolled ? 'glass py-4 shadow-lg' : 'bg-transparent py-6'}`}>
        <div className="container flex justify-between items-center">
          <Link to="/" className="text-2xl font-bold font-serif tracking-widest text-[#064e3b] flex items-center gap-2">
            <div className="w-10 h-10 bg-[#064e3b] rounded-full flex items-center justify-center text-[#d4af37]">L</div>
            <span>LUMINA <span className="text-[#d4af37]">SPA</span></span>
          </Link>

          {/* Desktop Links */}
          <div className="hidden md:flex items-center space-x-8">
            <div className="flex space-x-8">
              {navLinks.map((link) => (
                <Link 
                  key={link.path} 
                  to={link.path} 
                  className={`text-sm font-medium tracking-wider uppercase transition-colors hover:text-[#d4af37] ${location.pathname === link.path ? 'text-[#d4af37] border-b-2 border-[#d4af37]' : 'text-[#1e293b]'}`}
                >
                  {link.name}
                </Link>
              ))}
            </div>
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setIsCartOpen(true)}
                className="relative p-2 text-[#1e293b] hover:text-[#d4af37] transition-colors group"
              >
                <ShoppingBag size={24} />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-pink-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-md">
                    {cartCount}
                  </span>
                )}
              </button>

              <Link to="/notifications" className="p-2 text-[#1e293b] hover:text-[#d4af37] transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"></path><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"></path></svg>
              </Link>

              <Link to="/booking" className="btn-primary">
                <Calendar size={18} />
                <span>Đặt lịch</span>
              </Link>
            </div>
            
            {currentUser ? (
              <div className="flex items-center gap-4 ml-4">
                <Link to="/profile" className="flex items-center gap-2 group">
                    <div className="w-8 h-8 rounded-full bg-[#d4af37] flex items-center justify-center text-[#064e3b] font-bold group-hover:scale-110 transition-transform">
                        {currentUser.username.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm font-bold text-[#064e3b] group-hover:text-[#d4af37]">Account</span>
                </Link>
                <button onClick={handleLogout} className="text-xs uppercase tracking-wider font-bold text-red-500 hover:text-red-700">Logout</button>
              </div>
            ) : (
              <Link to="/login" className="flex items-center justify-center w-10 h-10 rounded-full border border-gray-200 text-[#1e293b] hover:bg-[#064e3b] hover:text-white transition-all ml-4">
                <User size={20} />
              </Link>
            )}
          </div>

          {/* Mobile Toggle */}
          <div className="md:hidden flex items-center space-x-2">
            <button onClick={() => setIsCartOpen(true)} className="relative p-2 text-[#1e293b] group">
              <ShoppingBag size={22} />
              {cartCount > 0 && (
                <span className="absolute top-0 right-0 bg-pink-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center shadow-sm">
                  {cartCount}
                </span>
              )}
            </button>
            
            {!currentUser && (
              <Link to="/login" className="text-[#1e293b] p-2">
                <User size={22} />
              </Link>
            )}
            <button onClick={() => setIsOpen(!isOpen)} className="text-[#1e293b] p-2">
              {isOpen ? <X size={28} /> : <Menu size={28} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isOpen && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden glass border-t border-white/20 mt-4 overflow-hidden"
            >
              <div className="flex flex-col p-6 space-y-4">
                {navLinks.map((link) => (
                  <Link 
                    key={link.path} 
                    to={link.path} 
                    onClick={() => setIsOpen(false)}
                    className="text-lg font-medium"
                  >
                    {link.name}
                  </Link>
                ))}
                <Link 
                  to="/booking" 
                  onClick={() => setIsOpen(false)}
                  className="btn-primary text-center"
                >
                  Book Appointment
                </Link>
                {currentUser && (
                  <button onClick={handleLogout} className="text-red-500 font-bold text-left pt-4 border-t border-gray-100">Logout</button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Cart Drawer */}
      <AnimatePresence>
        {isCartOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
              onClick={() => setIsCartOpen(false)}
            />
            <motion.div 
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 h-full w-full max-w-md bg-white z-[70] shadow-2xl flex flex-col"
            >
              <div className="p-6 border-b flex justify-between items-center bg-[#064e3b] text-white">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <ShoppingBag /> Giỏ hàng ({cartCount})
                </h2>
                <button onClick={() => setIsCartOpen(false)} className="p-2 hover:bg-white/10 rounded-full">
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {cartItems.length === 0 ? (
                  <div className="text-center py-20">
                    <ShoppingBag size={64} className="mx-auto text-gray-200 mb-4" />
                    <p className="text-gray-500">Giỏ hàng của bạn đang trống.</p>
                  </div>
                ) : (
                  cartItems.map(item => (
                    <div key={item.id} className="flex gap-4 items-center">
                      <img src={getImageUrl(item.imageUrl)} alt={item.name} className="w-20 h-20 rounded-2xl object-cover border" />
                      <div className="flex-1">
                        <h4 className="font-bold text-sm text-gray-800 line-clamp-1">{item.name}</h4>
                        <p className="text-xs text-gray-500">Số lượng: {item.quantity}</p>
                        <p className="text-sm font-bold text-[#064e3b] mt-1">{item.price.toLocaleString()}đ</p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="p-6 border-t bg-gray-50">
                <div className="flex justify-between items-center mb-6">
                  <span className="text-gray-500 font-medium">Tổng cộng:</span>
                  <span className="text-2xl font-bold text-[#064e3b]">{cartTotal.toLocaleString()}đ</span>
                </div>
                <Link 
                  to="/checkout-product" 
                  onClick={() => setIsCartOpen(false)}
                  className="btn-primary w-full justify-center py-4 text-lg"
                >
                  Tiến hành thanh toán
                </Link>
                <button 
                  onClick={() => setIsCartOpen(false)}
                  className="w-full text-center mt-4 text-sm text-gray-400 font-medium"
                >
                  Tiếp tục mua sắm
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default Navbar;
