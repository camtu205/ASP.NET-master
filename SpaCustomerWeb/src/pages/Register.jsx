import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, Phone, MapPin, ArrowRight, Loader2, Info, ChevronLeft } from 'lucide-react';
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

  const inputStyle = "w-full pl-12 pr-4 py-4 rounded-2xl bg-white border border-gray-100 focus:border-[#d4af37] focus:ring-4 focus:ring-[#d4af37]/5 outline-none transition-all shadow-sm text-[#1e293b]";
  const labelStyle = "block text-xs font-bold uppercase tracking-[0.1em] text-[#64748b] mb-2 ml-1";

  return (
    <div className="auth-page min-h-screen pt-32 pb-20 flex items-center justify-center px-6 bg-[#fdfbf9]">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl w-full bg-white p-12 rounded-[3rem] shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-gray-50 relative"
      >
        <Link to="/login" className="absolute top-8 left-8 text-[#64748b] hover:text-[#064e3b] flex items-center gap-2 text-sm font-medium transition-colors">
          <ChevronLeft size={18} /> Back
        </Link>

        <div className="text-center mb-12 mt-4">
          <h1 className="text-5xl font-serif mb-4 text-[#1e293b]">Join Lumina</h1>
          <p className="text-[#64748b] text-lg">Start your journey to absolute wellness today</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className={labelStyle}>Username</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-[#94a3b8]" size={18} />
                <input 
                  type="text" 
                  placeholder="Choose a username" 
                  className={inputStyle}
                  onChange={(e) => setFormData({...formData, username: e.target.value})}
                  required
                />
              </div>
            </div>
            <div>
              <label className={labelStyle}>Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-[#94a3b8]" size={18} />
                <input 
                  type="password" 
                  placeholder="Set your password" 
                  className={inputStyle}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  required
                />
              </div>
            </div>
          </div>

          <div className="border-t border-gray-50 pt-6">
            <label className={labelStyle}>Full Name</label>
            <div className="relative">
              <Info className="absolute left-4 top-1/2 -translate-y-1/2 text-[#94a3b8]" size={18} />
              <input 
                type="text" 
                placeholder="Enter your full legal name" 
                className={inputStyle}
                onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                required
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className={labelStyle}>Phone Number</label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-[#94a3b8]" size={18} />
                <input 
                  type="tel" 
                  placeholder="09xx xxx xxx" 
                  className={inputStyle}
                  onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})}
                  required
                />
              </div>
            </div>
            <div>
              <label className={labelStyle}>Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-[#94a3b8]" size={18} />
                <input 
                  type="email" 
                  placeholder="example@email.com" 
                  className={inputStyle}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  required
                />
              </div>
            </div>
          </div>

          <div>
            <label className={labelStyle}>Home Address</label>
            <div className="relative">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-[#94a3b8]" size={18} />
              <input 
                type="text" 
                placeholder="Where can we find you?" 
                className={inputStyle}
                onChange={(e) => setFormData({...formData, address: e.target.value})}
                required
              />
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full py-5 text-lg flex items-center justify-center gap-3 mt-8 shadow-xl hover:shadow-[#064e3b]/20 transition-all">
            {loading ? <Loader2 className="animate-spin" size={24} /> : <>Complete Registration <ArrowRight size={22} /></>}
          </button>
        </form>

        <p className="text-center mt-10 text-[#64748b]">
          Already an explorer of peace? <Link to="/login" className="text-[#064e3b] font-bold hover:underline">Login here</Link>
        </p>
      </motion.div>
    </div>
  );
};

export default Register;
