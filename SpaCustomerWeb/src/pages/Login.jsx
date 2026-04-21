import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, ArrowRight, Loader2 } from 'lucide-react';
import { login } from '../services/api';

const Login = () => {
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const data = await login(formData);
      localStorage.setItem('spa_token', data.token);
      localStorage.setItem('spa_user', JSON.stringify(data.user));
      navigate('/');
    } catch (err) {
      alert(err.message || 'Login failed. Please check your credentials.');
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
        className="glass max-w-md w-full p-10 rounded-[40px] shadow-2xl relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#d4af37]/10 rounded-full -mr-16 -mt-16 blur-2xl" />
        
        <div className="text-center mb-10">
          <h1 className="text-4xl font-serif mb-2">Welcome Back</h1>
          <p className="text-[#475569]">Sign in to manage your appointments</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-[#94a3b8]" size={20} />
            <input 
              type="text" 
              placeholder="Username" 
              className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white/50 border border-white focus:border-[#d4af37] outline-none transition-all"
              onChange={(e) => setFormData({...formData, username: e.target.value})}
              required
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-[#94a3b8]" size={20} />
            <input 
              type="password" 
              placeholder="Password" 
              className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white/50 border border-white focus:border-[#d4af37] outline-none transition-all"
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              required
            />
          </div>

          <div className="flex justify-between items-center text-sm">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="accent-[#064e3b]" />
              <span className="text-[#475569]">Remember me</span>
            </label>
            <a href="#" className="text-[#d4af37] font-medium">Forgot password?</a>
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full py-4 text-lg flex items-center justify-center gap-2">
            {loading ? <Loader2 className="animate-spin" size={20} /> : <>Sign In <ArrowRight size={20} /></>}
          </button>
        </form>

        <p className="text-center mt-10 text-[#475569]">
          Don't have an account? <Link to="/register" className="text-[#064e3b] font-bold">Register</Link>
        </p>
      </motion.div>
    </div>
  );
};

export default Login;
