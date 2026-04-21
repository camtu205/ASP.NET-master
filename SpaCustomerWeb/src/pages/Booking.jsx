import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  User as UserIcon, 
  CheckCircle, 
  Loader2, 
  ChevronRight, 
  ChevronLeft, 
  ShoppingBag,
  Star,
  Plus,
  Trash2,
  Info,
  ArrowRight
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getServices, getStaffs, getRoomTypes, getProducts, bookAppointment } from '../services/api';

const steps = [
  { id: 1, title: 'Services' },
  { id: 2, title: 'Time & Staff' },
  { id: 3, title: 'Room' },
  { id: 4, title: 'Upsell' },
  { id: 5, title: 'Review' }
];

const Booking = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const initialServices = location.state?.selectedServices || [];

  const [step, setStep] = useState(1);
  const [services, setServices] = useState([]);
  const [staffs, setStaffs] = useState([]);
  const [roomTypes, setRoomTypes] = useState([]);
  const [products, setProducts] = useState([]);
  
  const [selectedServices, setSelectedServices] = useState(initialServices);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [selectedRoomType, setSelectedRoomType] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [selectedProducts, setSelectedProducts] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isBooked, setIsBooked] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [sData, stData, rtData, pData] = await Promise.all([
          getServices(),
          getStaffs(),
          getRoomTypes(),
          getProducts()
        ]);
        setServices(sData);
        setStaffs(stData);
        setRoomTypes(rtData);
        setProducts(pData.slice(0, 4));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const totalServiceDuration = selectedServices.reduce((sum, s) => sum + s.durationMinutes, 0);
  const basePrice = selectedServices.reduce((sum, s) => sum + Number(s.price), 0);
  const roomMultiplier = selectedRoomType ? Number(selectedRoomType.priceMultiplier) : 1;
  const totalPrice = (basePrice * roomMultiplier) + selectedProducts.reduce((sum, p) => sum + Number(p.price), 0);

  const toggleProduct = (product) => {
    setSelectedProducts(prev => 
      prev.find(p => p.id === product.id) 
        ? prev.filter(p => p.id !== product.id) 
        : [...prev, product]
    );
  };

  const validateDateTime = () => {
    if (!selectedDate || !selectedTime) return "Please select date and time.";
    const now = new Date();
    const bookingTime = new Date(`${selectedDate}T${selectedTime}`);
    const minTime = new Date(now.getTime() + 30 * 60000);
    
    if (bookingTime < now) return "You cannot select a time in the past.";
    if (bookingTime < minTime) return "Appointments must be booked at least 30 minutes in advance.";
    return null;
  };

  const handleBooking = async () => {
    setSubmitting(true);
    try {
      const savedUser = localStorage.getItem('spa_user');
      const user = savedUser ? JSON.parse(savedUser) : null;
      
      const dateTime = new Date(`${selectedDate}T${selectedTime}`);
      await bookAppointment({
        customerId: user?.id || 1, // Get real ID from logged in user
        appointmentDate: dateTime.toISOString(),
        serviceIds: selectedServices.map(s => s.id),
        staffId: selectedStaff?.id || null,
        // Since the backend 'BookAppointment' doesn't take RoomType directly but BedId, 
        // in a real app we'd choose a bed from the room type. 
        // For this UI demo, we'll send a dummy bedId if a room type is selected.
        bedId: selectedRoomType ? 1 : null 
      });
      setIsBooked(true);
    } catch (err) {
      alert('Booking failed: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="pt-40 flex items-center justify-center min-h-[60vh]">
      <Loader2 className="animate-spin text-[#064e3b]" size={48} />
    </div>
  );

  if (isBooked) return (
    <div className="pt-40 container max-w-2xl text-center">
      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass p-16 rounded-[3rem] shadow-2xl">
        <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-8">
          <CheckCircle size={48} />
        </div>
        <h2 className="text-4xl font-serif mb-4">Booking Confirmed!</h2>
        <p className="text-[#475569] mb-10 leading-relaxed">Your sanctuary is ready. We've sent the details to your email. We look forward to welcoming you.</p>
        <button onClick={() => navigate('/')} className="btn-primary px-12 py-4">Return Home</button>
      </motion.div>
    </div>
  );

  return (
    <div className="booking-page pt-32 pb-20">
      <div className="container max-w-5xl">
        <div className="text-center mb-12">
          <h2 className="text-sm uppercase tracking-[0.3em] text-[#d4af37] font-bold mb-2">Lumina Experience</h2>
          <h1 className="text-4xl font-serif">Sanctuary Booking <span className="text-[#d4af37] text-lg font-sans ml-2">v2.0 - Premium</span></h1>
        </div>
        {/* Progress Stepper */}
        <div className="flex justify-between mb-16 relative">
          <div className="absolute top-1/2 left-0 w-full h-0.5 bg-gray-100 -translate-y-1/2 z-0" />
          {steps.map((s) => (
            <div key={s.id} className="relative z-10 flex flex-col items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 font-bold ${step >= s.id ? 'bg-[#064e3b] text-white' : 'bg-white text-gray-400 border-2'}`}>
                {step > s.id ? <CheckCircle size={18} /> : s.id}
              </div>
              <span className={`text-xs mt-3 font-bold uppercase tracking-widest ${step >= s.id ? 'text-[#064e3b]' : 'text-gray-400'}`}>{s.title}</span>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-12">
          {/* Main Form Area */}
          <div className="lg:col-span-2">
            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div key="step1" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }}>
                  <h3 className="text-3xl font-serif mb-8">Select Your Treatments</h3>
                  <div className="grid gap-4">
                    {services.map(service => (
                      <div 
                        key={service.id}
                        onClick={() => {
                          setSelectedServices(prev => 
                            prev.find(s => s.id === service.id) ? prev.filter(s => s.id !== service.id) : [...prev, service]
                          );
                        }}
                        className={`p-6 rounded-3xl border-2 transition-all cursor-pointer flex justify-between items-center ${selectedServices.find(s => s.id === service.id) ? 'border-[#d4af37] bg-[#fcfaf8]' : 'border-gray-100 bg-white hover:border-gray-200'}`}
                      >
                        <div>
                          <h4 className="font-bold text-lg">{service.name}</h4>
                          <p className="text-sm text-gray-500">{service.durationMinutes} mins • ${service.price}</p>
                        </div>
                        {selectedServices.find(s => s.id === service.id) ? <CheckCircle className="text-[#d4af37]" /> : <Plus className="text-gray-300" />}
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div key="step2" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }}>
                  <h3 className="text-3xl font-serif mb-8">When & With Whom?</h3>
                  <div className="space-y-8">
                    <div>
                      <label className="block text-sm font-bold uppercase tracking-widest text-gray-400 mb-4">Select Date & Time</label>
                      <div className="grid sm:grid-cols-2 gap-4">
                        <input 
                          type="date" 
                          className="input-field" 
                          value={selectedDate}
                          onChange={(e) => setSelectedDate(e.target.value)}
                        />
                        <input 
                          type="time" 
                          className="input-field" 
                          value={selectedTime}
                          onChange={(e) => setSelectedTime(e.target.value)}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-bold uppercase tracking-widest text-gray-400 mb-4">Request a Technician (Optional)</label>
                      <div className="grid sm:grid-cols-2 gap-4">
                        {staffs.map(staff => (
                          <div 
                            key={staff.id}
                            onClick={() => setSelectedStaff(selectedStaff?.id === staff.id ? null : staff)}
                            className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${selectedStaff?.id === staff.id ? 'border-[#064e3b] bg-[#f0fdf4]' : 'border-gray-100 hover:border-gray-200'}`}
                          >
                            <h5 className="font-bold">{staff.fullName}</h5>
                            <p className="text-xs text-gray-500 uppercase tracking-tighter">{staff.position}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div key="step3" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }}>
                  <h3 className="text-3xl font-serif mb-8">Experience Layer</h3>
                  <p className="text-gray-500 mb-8">Enhance your privacy and comfort by choosing a room type.</p>
                  <div className="grid gap-6">
                    {roomTypes.map(rt => (
                      <div 
                        key={rt.id}
                        onClick={() => setSelectedRoomType(selectedRoomType?.id === rt.id ? null : rt)}
                        className={`p-8 rounded-[2rem] border-2 cursor-pointer transition-all ${selectedRoomType?.id === rt.id ? 'border-[#d4af37] bg-[#fcfaf8]' : 'border-gray-100 hover:border-gray-200'}`}
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <h4 className="text-xl font-bold mb-2">{rt.name}</h4>
                            <p className="text-sm text-gray-500">{rt.description}</p>
                          </div>
                          <div className="text-right">
                            <span className="text-xs uppercase font-bold text-[#d4af37] block mb-1">Price Factor</span>
                            <span className="text-2xl font-serif">x{rt.priceMultiplier}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {step === 4 && (
                <motion.div key="step4" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }}>
                  <h3 className="text-3xl font-serif mb-2">Enhance Your Glow</h3>
                  <p className="text-gray-500 mb-10">Clients who booked these services also loved our organic collection.</p>
                  <div className="grid sm:grid-cols-2 gap-6">
                    {products.map(product => (
                      <div key={product.id} className="glass p-6 rounded-3xl flex gap-4 items-center">
                        <img src={product.imageUrl || "https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&q=40&w=100"} className="w-16 h-16 rounded-xl object-cover" />
                        <div className="flex-1">
                          <h5 className="font-bold text-sm">{product.name}</h5>
                          <p className="text-[#064e3b] font-bold">${product.price}</p>
                        </div>
                        <button 
                          onClick={() => toggleProduct(product)}
                          className={`p-2 rounded-full transition-all ${selectedProducts.find(p => p.id === product.id) ? 'bg-red-50 text-red-500 hover:bg-red-100' : 'bg-[#064e3b] text-white'}`}
                        >
                          {selectedProducts.find(p => p.id === product.id) ? <Trash2 size={16} /> : <Plus size={16} />}
                        </button>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => setStep(5)} className="mt-12 text-[#064e3b] font-bold flex items-center gap-2 hover:gap-4 transition-all">
                    No thanks, just my treatments <ArrowRight size={18} />
                  </button>
                </motion.div>
              )}

              {step === 5 && (
                <motion.div key="step5" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }}>
                  <h3 className="text-3xl font-serif mb-8">Confirm Details</h3>
                  <div className="space-y-6">
                    <div className="flex items-start gap-4 p-6 bg-[#fcfaf8] rounded-3xl">
                      <Info className="text-[#d4af37]" />
                      <div>
                        <p className="font-bold text-[#064e3b]">Schedule Summary</p>
                        <p className="text-sm text-gray-600">
                          {selectedDate} • {selectedTime} <br />
                          Est. Duration: {totalServiceDuration} minutes
                        </p>
                      </div>
                    </div>
                    {selectedStaff && (
                      <p className="px-6 text-sm">Requested Specialist: <span className="font-bold">{selectedStaff.fullName}</span></p>
                    )}
                    <div className="border-t pt-6 px-6">
                      <label className="flex items-center gap-3 cursor-pointer group">
                        <input type="checkbox" className="w-5 h-5 accent-[#064e3b]" required />
                        <span className="text-sm text-gray-600">I agree to the cancellation policy and sanctuary rules.</span>
                      </label>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Navigation Buttons */}
            <div className="mt-16 flex justify-between">
              {step > 1 ? (
                <button onClick={() => setStep(step - 1)} className="btn-outline flex items-center gap-2">
                  <ChevronLeft size={18} /> Back
                </button>
              ) : <div />}
              
              {step < 5 ? (
                <button 
                  disabled={selectedServices.length === 0 || (step === 2 && (!selectedDate || !selectedTime))}
                  onClick={() => {
                    const error = step === 2 ? validateDateTime() : null;
                    if (error) { alert(error); return; }
                    setStep(step + 1);
                  }} 
                  className="btn-primary"
                >
                  Continue <ChevronRight size={18} />
                </button>
              ) : (
                <button 
                  onClick={handleBooking} 
                  disabled={submitting} 
                  className="btn-primary px-16 relative overflow-hidden"
                >
                  {submitting ? (
                    <Loader2 className="animate-spin" size={20} />
                  ) : (
                    <span>Confirm Sanctuary Booking • ${totalPrice.toFixed(2)}</span>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Sidebar Summary */}
          <div className="lg:col-span-1">
            <div className="glass p-8 rounded-[2.5rem] sticky top-32">
              <h4 className="text-xl font-serif mb-6 border-b pb-4">Booking Summary</h4>
              
              <div className="space-y-4 mb-8 max-h-60 overflow-y-auto">
                {selectedServices.map(s => (
                  <div key={s.id} className="flex justify-between text-sm">
                    <span className="text-gray-600">{s.name}</span>
                    <span className="font-bold">${s.price}</span>
                  </div>
                ))}
                {selectedRoomType && (
                  <div className="flex justify-between text-sm py-2 border-t border-[#d4af37]/20">
                    <span className="text-[#d4af37] font-medium">{selectedRoomType.name} Multiplier</span>
                    <span className="font-bold">x{selectedRoomType.priceMultiplier}</span>
                  </div>
                )}
                {selectedProducts.map(p => (
                  <div key={p.id} className="flex justify-between text-sm text-green-700">
                    <span>{p.name}</span>
                    <span className="font-bold">${p.price}</span>
                  </div>
                ))}
              </div>

              {selectedServices.length === 0 && (
                <p className="text-xs text-center text-gray-400 mb-8 italic">No treatments selected yet.</p>
              )}

              <div className="border-t-2 border-dashed pt-6 flex justify-between items-end">
                <span className="text-gray-400 text-sm italic">Grand Total</span>
                <span className="text-3xl font-serif text-[#064e3b]">${totalPrice.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Booking;
