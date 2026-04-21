import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, Phone, MapPin, ArrowRight, Loader2, Info } from 'lucide-react';
import { register } from '../services/api';

const Register = () => {
  const [formData, setFormData] = useState({ 
    username: '', 
    password: '', 
    fullName: '',
    phoneNumber: '',
    email: '',
    address: '',
    role: 'Customer' 
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await register(formData);
      alert('Registration successful! Please login.');
      navigate('/login');
    } catch (err) {
      alert(err.message || 'Registration failed. Please check your data.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page min-h-screen pt-32 pb-20 flex items-center justify-center px-6" 
         style={{ background: 'radial-gradient(circle at center, #fdfbf9 0%, #f3e5ab22 100%)' }}>
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass max-w-xl w-full p-10 rounded-[40px] shadow-2xl relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#064e3b]/5 rounded-full -mr-16 -mt-16 blur-2xl" />
        
        <div className="text-center mb-10">
          <h1 className="text-4xl font-serif mb-2">Join Lumina</h1>
          <p className="text-[#475569]">Start your journey to wellness today</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="relative col-span-2 md:col-span-1">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-[#94a3b8]" size={18} />
              <input 
                type="text" 
                placeholder="Username" 
                className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-white/50 border border-white focus:border-[#d4af37] outline-none transition-all"
                onChange={(e) => setFormData({...formData, username: e.target.value})}
                required
              />
            </div>
            <div className="relative col-span-2 md:col-span-1">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-[#94a3b8]" size={18} />
              <input 
                type="password" 
                placeholder="Password" 
                className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-white/50 border border-white focus:border-[#d4af37] outline-none transition-all"
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                required
              />
            </div>
          </div>

          <div className="relative">
            <Info className="absolute left-4 top-1/2 -translate-y-1/2 text-[#94a3b8]" size={18} />
            <input 
              type="text" 
              placeholder="Full Name" 
              className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-white/50 border border-white focus:border-[#d4af37] outline-none transition-all"
              onChange={(e) => setFormData({...formData, fullName: e.target.value})}
              required
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="relative">
              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-[#94a3b8]" size={18} />
              <input 
                type="tel" 
                placeholder="Phone Number" 
                className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-white/50 border border-white focus:border-[#d4af37] outline-none transition-all"
                onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})}
                required
              />
            </div>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-[#94a3b8]" size={18} />
              <input 
                type="email" 
                placeholder="Email Address" 
                className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-white/50 border border-white focus:border-[#d4af37] outline-none transition-all"
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                required
              />
            </div>
          </div>

          <div className="relative">
            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-[#94a3b8]" size={18} />
            <input 
              type="text" 
              placeholder="Home Address" 
              className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-white/50 border border-white focus:border-[#d4af37] outline-none transition-all"
              onChange={(e) => setFormData({...formData, address: e.target.value})}
              required
            />
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full py-4 text-lg flex items-center justify-center gap-2 mt-6">
            {loading ? <Loader2 className="animate-spin" size={20} /> : <>Complete Registration <ArrowRight size={20} /></>}
          </button>
        </form>

        <p className="text-center mt-8 text-[#475569]">
          Already an explorer of peace? <Link to="/login" className="text-[#064e3b] font-bold">Login here</Link>
        </p>
      </motion.div>
    </div>
  );
};

export default Register;
