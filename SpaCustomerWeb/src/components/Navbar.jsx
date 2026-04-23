import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, User, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    
    // Check for logged in user info
    const savedUser = localStorage.getItem('spa_user');
    if (savedUser) {
      try {
        setCurrentUser(JSON.parse(savedUser));
      } catch (e) {
        console.error("Failed to parse user data", e);
      }
    }

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
          <Link to="/notifications" className="relative p-2 text-[#1e293b] hover:text-[#d4af37] transition-colors">
            <Calendar size={22} className="hidden" /> {/* Placeholder to keep spacing if needed */}
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"></path><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"></path></svg>
          </Link>
          <Link to="/booking" className="btn-primary">
            <Calendar size={18} />
            <span>Book Now</span>
          </Link>
          
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
        <div className="md:hidden flex items-center space-x-4">
          {!currentUser && (
            <Link to="/login" className="text-[#1e293b]">
              <User size={22} />
            </Link>
          )}
          <button onClick={() => setIsOpen(!isOpen)} className="text-[#1e293b]">
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
  );
};

export default Navbar;
