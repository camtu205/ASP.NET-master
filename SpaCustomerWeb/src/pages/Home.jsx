import React from 'react';
import { motion } from 'framer-motion';
import { Leaf, Sparkles, Wind, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const Home = () => {
  return (
    <div className="home-page">
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center transition-transform duration-[10s] scale-110"
          style={{ 
            backgroundImage: "url('/hero-bg.png')",
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        >
          <div className="absolute inset-0 bg-black/40" />
        </div>
        
        <div className="relative z-10 container text-center text-white fade-in">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <span className="inline-block px-4 py-1 mb-6 border border-[#d4af37] rounded-full text-[#d4af37] text-sm tracking-widest uppercase font-medium">
              Sanctuary of Serenity
            </span>
            <h1 className="text-5xl md:text-7xl font-serif mb-8 leading-tight">
              Rejuvenate Your <br /> <span className="italic text-[#d4af37]">Soul & Body</span>
            </h1>
            <p className="text-xl md:text-2xl font-light mb-12 max-w-2xl mx-auto text-white/90">
              Experience the pinnacle of luxury wellness treatments tailored to your unique essence.
            </p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center">
              <Link to="/booking" className="btn-primary py-5 px-12 text-lg">
                Book an Appointment
              </Link>
              <Link to="/services" className="btn-outline border-white text-white hover:bg-white hover:text-[#064e3b] py-5 px-12 text-lg">
                Explore Services
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="section-padding bg-white">
        <div className="container">
          <div className="text-center mb-20 fade-in">
            <h2 className="text-4xl md:text-5xl font-serif mb-4">Why Choose Lumina</h2>
            <p className="text-[#475569] max-w-2xl mx-auto">We combine ancient wisdom with modern techniques to provide an unparalleled wellness experience.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-10">
            {[
              { icon: <Leaf className="text-[#064e3b]" />, title: "Organic Essence", desc: "We use 100% natural and organic ingredients in all our treatments." },
              { icon: <Sparkles className="text-[#d4af37]" />, title: "Expert Therapists", desc: "Our team consists of certified practitioners with years of global experience." },
              { icon: <Wind className="text-[#064e3b]" />, title: "Tranquil Space", desc: "Designed to provide immediate peace the moment you step inside." }
            ].map((feature, idx) => (
              <motion.div 
                key={idx}
                whileHover={{ y: -10 }}
                className="card text-center flex flex-col items-center"
              >
                <div className="w-20 h-20 bg-[#fcfaf8] rounded-full flex items-center justify-center mb-8 shadow-sm border border-[#f3e5ab]">
                  {feature.icon}
                </div>
                <h3 className="text-2xl font-serif mb-4">{feature.title}</h3>
                <p className="text-[#475569] leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="section-padding relative overflow-hidden bg-[#064e3b] text-white">
        <div className="container relative z-10 text-center">
          <h2 className="text-4xl md:text-5xl font-serif mb-8 max-w-3xl mx-auto">
            Ready to embark on your <br /> <span className="text-[#d4af37]">wellness journey?</span>
          </h2>
          <Link to="/register" className="inline-flex items-center gap-2 px-10 py-4 bg-[#d4af37] text-[#064e3b] rounded-full font-bold text-lg hover:bg-[#c4a030] transition-colors">
            Get Started Now <ArrowRight size={20} />
          </Link>
        </div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full -ml-32 -mb-32 blur-3xl" />
      </section>
    </div>
  );
};

export default Home;
