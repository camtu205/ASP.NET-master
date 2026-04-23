import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, DollarSign, Calendar, AlertCircle, Loader2, Check, X, ArrowRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { getServices, getImageUrl } from '../services/api';

const Services = () => {
  const [services, setServices] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const data = await getServices();
        setServices(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchServices();
  }, []);

  const toggleService = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const selectedServices = services.filter(s => selectedIds.includes(s.id));
  const totalPrice = selectedServices.reduce((sum, s) => sum + Number(s.price), 0);

  if (loading) return (
    <div className="pt-40 flex items-center justify-center min-h-[60vh]">
      <Loader2 className="animate-spin text-[#064e3b]" size={48} />
    </div>
  );

  if (error) return (
    <div className="pt-40 container text-center">
      <div className="glass p-10 rounded-3xl border-red-100 mx-auto max-w-lg">
        <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
        <h2 className="text-2xl font-serif mb-2">Failed to Load Services</h2>
        <p className="text-red-600 mb-6">{error}</p>
        <button onClick={() => window.location.reload()} className="btn-primary">Try Again</button>
      </div>
    </div>
  );

  return (
    <div className="services-page pt-24 pb-20">
      <section className="section-padding">
        <div className="container">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-16"
          >
            <h1 className="text-5xl font-serif mb-6">Our Services</h1>
            <p className="text-[#475569] max-w-2xl mx-auto">Discover our range of professional spa treatments. You can select multiple services to customize your experience.</p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-10">
            {services.map((service, idx) => (
              <motion.div 
                key={service.id}
                onClick={() => toggleService(service.id)}
                className={`card !p-0 overflow-hidden flex flex-col md:flex-row group cursor-pointer transition-all duration-300 ${selectedIds.includes(service.id) ? 'ring-2 ring-[#d4af37] scale-[1.02] shadow-2xl' : ''}`}
              >
                <div className="md:w-1/2 overflow-hidden h-64 md:h-auto bg-gray-100 relative">
                  <img src={getImageUrl(service.imageUrl)} alt={service.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                  {selectedIds.includes(service.id) && (
                    <div className="absolute inset-0 bg-[#064e3b]/40 flex items-center justify-center">
                      <div className="bg-[#d4af37] text-white p-3 rounded-full">
                        <Check size={32} strokeWidth={3} />
                      </div>
                    </div>
                  )}
                </div>
                <div className="md:w-1/2 p-10 flex flex-col justify-between bg-white/50 backdrop-blur-sm">
                  <div>
                    <span className="text-xs uppercase tracking-widest text-[#d4af37] font-bold mb-3 block">{service.category?.name || "Premium Care"}</span>
                    <h2 className="text-2xl font-serif mb-4 leading-tight">{service.name}</h2>
                    <p className="text-[#475569] text-sm mb-6 leading-relaxed line-clamp-3">{service.description || "Indulge in a world-class treatment designed for your ultimate relaxation."}</p>
                    
                    <div className="flex items-center gap-6 mb-4 text-sm text-[#1e293b] font-medium">
                      <div className="flex items-center gap-2">
                        <Clock size={16} className="text-[#064e3b]" />
                        <span>{service.durationMinutes} mins</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <DollarSign size={16} className="text-[#064e3b]" />
                        <span>${service.price}</span>
                      </div>
                    </div>
                  </div>
                  
                  <button 
                    className={`btn-primary w-full justify-center gap-2 ${selectedIds.includes(service.id) ? 'bg-[#064e3b] text-white' : ''}`}
                  >
                    {selectedIds.includes(service.id) ? 'Selected' : 'Select Service'}
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Selected Services Tray */}
      <AnimatePresence>
        {selectedIds.length > 0 && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-0 left-0 w-full z-50 p-6"
          >
            <div className="container max-w-4xl">
              <div className="glass border-[#d4af37]/30 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] p-6 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex flex-wrap gap-3">
                  {selectedServices.map(s => (
                    <span key={s.id} className="bg-[#064e3b] text-white px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2">
                      {s.name}
                      <X size={14} className="cursor-pointer" onClick={(e) => { e.stopPropagation(); toggleService(s.id); }} />
                    </span>
                  ))}
                  {selectedIds.length > 0 && (
                    <span className="text-[#064e3b] font-medium self-center ml-2 border-l pl-4 border-gray-200">
                      Total: <span className="font-bold">${totalPrice.toFixed(2)}</span>
                    </span>
                  )}
                </div>
                <div className="flex gap-4">
                  <button 
                    onClick={() => setSelectedIds([])}
                    className="text-gray-500 hover:text-red-500 text-sm font-bold uppercase tracking-wider"
                  >
                    Clear All
                  </button>
                  <button 
                    onClick={() => navigate('/booking', { state: { selectedServices } })}
                    className="btn-primary"
                  >
                    Proceed to Booking <ArrowRight size={18} />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Services;
