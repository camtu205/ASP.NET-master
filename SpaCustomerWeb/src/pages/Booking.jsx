import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar as CalendarIcon, Clock, User, CheckCircle, Loader2 } from 'lucide-react';
import { getServices, bookAppointment } from '../services/api';

const steps = [
  { id: 1, title: 'Service' },
  { id: 2, title: 'DateTime' },
  { id: 3, title: 'Confirm' }
];

const Booking = () => {
  const [step, setStep] = useState(1);
  const [services, setServices] = useState([]);
  const [selectedService, setSelectedService] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isBooked, setIsBooked] = useState(false);

  useEffect(() => {
    getServices()
      .then(setServices)
      .catch(err => alert('Error loading services: ' + err.message))
      .finally(() => setLoading(false));
  }, []);

  const timeSlots = ['09:00 AM', '10:30 AM', '01:00 PM', '02:30 PM', '04:00 PM', '05:30 PM'];

  const handleBooking = async () => {
    setSubmitting(true);
    try {
      // For real data, we combine date and time
      const dateTime = new Date(`${selectedDate}T${selectedTime.replace(' AM', ':00').replace(' PM', ':00')}`);
      if (selectedTime.includes('PM')) dateTime.setHours(dateTime.getHours() + 12);

      await bookAppointment({
        customerId: 1, // Placeholder: in real app, fetch from user profile
        appointmentDate: dateTime.toISOString(),
        serviceIds: [selectedService.id],
      });
      setIsBooked(true);
    } catch (err) {
      alert('Booking failed: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (isBooked) {
    return (
      <div className="pt-40 pb-20 flex items-center justify-center px-6">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="glass max-w-md w-full p-12 rounded-[40px] text-center"
        >
          <div className="w-24 h-24 bg-[#064e3b] text-white rounded-full flex items-center justify-center mx-auto mb-8">
            <CheckCircle size={48} />
          </div>
          <h1 className="text-3xl font-serif mb-4">Booking Confirmed!</h1>
          <p className="text-[#475569] mb-8">Your appointment for <strong>{selectedService?.name}</strong> has been scheduled successfully.</p>
          <button onClick={() => window.location.href = '/'} className="btn-primary w-full">Return Home</button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="booking-page pt-32 pb-20 px-6">
      <div className="container max-w-4xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-serif mb-4">Book Your Escape</h1>
          
          {/* Progress Bar */}
          <div className="flex justify-center items-center gap-4 mb-10">
            {steps.map((s) => (
              <div key={s.id} className="flex items-center gap-2">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${step >= s.id ? 'bg-[#064e3b] text-white' : 'bg-white text-[#94a3b8] border border-[#e2e8f0]'}`}>
                  {s.id}
                </div>
                <span className={`text-sm font-medium ${step >= s.id ? 'text-[#064e3b]' : 'text-[#94a3b8]'}`}>{s.title}</span>
                {s.id < 3 && <div className={`w-12 h-0.5 ${step > s.id ? 'bg-[#064e3b]' : 'bg-[#e2e8f0]'}`} />}
              </div>
            ))}
          </div>
        </div>

        <div className="glass p-8 md:p-12 rounded-[40px] min-h-[500px]">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div 
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <h2 className="text-2xl font-serif mb-8">Select a Service</h2>
                <div className="grid gap-4">
                  {services.map((service) => (
                    <div 
                      key={service.id}
                      onClick={() => setSelectedService(service)}
                      className={`p-6 rounded-2xl border-2 transition-all cursor-pointer flex justify-between items-center ${selectedService?.id === service.id ? 'border-[#d4af37] bg-[#d4af37]/5' : 'border-white bg-white/30 hover:border-[#e2e8f0]'}`}
                    >
                      <div>
                        <h3 className="font-bold text-lg">{service.name}</h3>
                        <p className="text-sm text-[#475569]">{service.duration} • {service.price}</p>
                      </div>
                      {selectedService?.id === service.id && <CheckCircle className="text-[#d4af37]" />}
                    </div>
                  ))}
                </div>
                <div className="mt-12 flex justify-end">
                  <button 
                    disabled={!selectedService}
                    onClick={() => setStep(2)}
                    className="btn-primary"
                    style={{ opacity: selectedService ? 1 : 0.5 }}
                  >
                    Next Step
                  </button>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div 
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <h2 className="text-2xl font-serif mb-8">Choose Date & Time</h2>
                <div className="grid md:grid-cols-2 gap-10">
                  <div>
                    <label className="block text-sm font-bold text-[#475569] mb-3">Select Date</label>
                    <input 
                      type="date" 
                      className="w-full p-4 rounded-2xl bg-white border-2 border-transparent focus:border-[#d4af37] outline-none"
                      onChange={(e) => setSelectedDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-[#475569] mb-3">Available Slots</label>
                    <div className="grid grid-cols-2 gap-3">
                      {timeSlots.map((time) => (
                        <button 
                          key={time}
                          onClick={() => setSelectedTime(time)}
                          className={`p-3 rounded-xl border-2 text-sm transition-all ${selectedTime === time ? 'border-[#064e3b] bg-[#064e3b] text-white' : 'border-white bg-white/50 hover:bg-white'}`}
                        >
                          {time}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="mt-12 flex justify-between">
                  <button onClick={() => setStep(1)} className="btn-outline">Previous</button>
                  <button 
                    disabled={!selectedDate || !selectedTime}
                    onClick={() => setStep(3)}
                    className="btn-primary"
                    style={{ opacity: (selectedDate && selectedTime) ? 1 : 0.5 }}
                  >
                    Review Details
                  </button>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div 
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <h2 className="text-2xl font-serif mb-8">Review Booking</h2>
                <div className="bg-white/50 rounded-3xl p-8 space-y-6">
                  <div className="flex justify-between border-b border-white pb-4">
                    <span className="text-[#475569]">Service</span>
                    <span className="font-bold">{selectedService?.name}</span>
                  </div>
                  <div className="flex justify-between border-b border-white pb-4">
                    <span className="text-[#475569]">Date</span>
                    <span className="font-bold">{selectedDate}</span>
                  </div>
                  <div className="flex justify-between border-b border-white pb-4">
                    <span className="text-[#475569]">Time</span>
                    <span className="font-bold">{selectedTime}</span>
                  </div>
                  <div className="flex justify-between border-b border-white pb-4">
                    <span className="text-[#475569]">Price</span>
                    <span className="font-bold text-[#064e3b]">{selectedService?.price}</span>
                  </div>
                </div>
                <div className="mt-12 flex justify-between">
                  <button onClick={() => setStep(2)} className="btn-outline">Edit Details</button>
                  <button onClick={handleBooking} disabled={submitting} className="btn-primary px-12">
                    {submitting ? <Loader2 className="animate-spin" size={18} /> : 'Confirm Booking'}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default Booking;
