import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clock, DollarSign, Calendar, AlertCircle, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getServices } from '../services/api';

const Services = () => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
            <p className="text-[#475569] max-w-2xl mx-auto">Discover our range of professional spa treatments designed to restore your balance and peace of mind.</p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-10">
            {services.map((service, idx) => (
              <motion.div 
                key={service.id}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="card !p-0 overflow-hidden flex flex-col md:flex-row group"
              >
                <div className="md:w-1/2 overflow-hidden h-64 md:h-auto bg-gray-100">
                  <img src={service.imageUrl || "/massage.png"} alt={service.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                </div>
                <div className="md:w-1/2 p-10 flex flex-col justify-between bg-white/50 backdrop-blur-sm">
                  <div>
                    <span className="text-xs uppercase tracking-widest text-[#d4af37] font-bold mb-3 block">{service.category?.name || "Premium Care"}</span>
                    <h2 className="text-2xl font-serif mb-4 leading-tight">{service.name}</h2>
                    <p className="text-[#475569] text-sm mb-8 leading-relaxed">{service.description || "Indulge in a world-class treatment designed for your ultimate relaxation."}</p>
                    
                    <div className="flex items-center gap-6 mb-8 text-sm text-[#1e293b] font-medium">
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
                  
                  <Link to="/booking" className="btn-primary w-full text-center flex items-center justify-center gap-3">
                    <Calendar size={18} />
                    Book Experience
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Services;
