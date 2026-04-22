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
  const [errorMessage, setErrorMessage] = useState('');
  
  const showValidationMessage = (msg) => {
    setErrorMessage(msg);
    setTimeout(() => setErrorMessage(''), 4000);
  };

  const handleNext = () => {
    if (step === 1 && selectedServices.length === 0) {
      showValidationMessage("Vui lòng chọn ít nhất một dịch vụ chăm sóc.");
      return;
    }
    if (step === 2) {
      const error = validateDateTime();
      if (error) {
        // Map common errors to Vietnamese
        let vnError = error;
        if (error.includes("select date")) vnError = "Vui lòng chọn đầy đủ ngày và giờ hẹn.";
        if (error.includes("past")) vnError = "Bạn không thể chọn thời gian trong quá khứ.";
        if (error.includes("30 minutes")) vnError = "Vui lòng đặt lịch trước ít nhất 30 phút.";
        
        showValidationMessage(vnError);
        return;
      }
    }
    if (step === 3) {
      // Room selection is optional, but if the user wants validation here we could add it
    }
    setStep(step + 1);
  };

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
    // Kiểm tra checkbox đồng ý điều khoản
    const checkbox = document.querySelector('input[type="checkbox"]');
    if (checkbox && !checkbox.checked) {
      showValidationMessage("Vui lòng đồng ý với các điều khoản của chúng tôi.");
      return;
    }

    const token = localStorage.getItem('spa_token');
    const userStr = localStorage.getItem('spa_user');
    const user = userStr ? JSON.parse(userStr) : null;
    const custId = localStorage.getItem('spa_customer_id') || user?.id; // Fallback to user ID if missing

    if (!token) {
      showValidationMessage("Vui lòng đăng nhập để thực hiện đặt lịch.");
      setTimeout(() => navigate('/login', { state: { from: '/booking' } }), 2000);
      return;
    }

    setSubmitting(true);
    try {
      const dateTime = new Date(`${selectedDate}T${selectedTime}`);
      await bookAppointment({
        customerId: parseInt(custId) || 1, 
        appointmentDate: dateTime.toISOString(),
        serviceIds: selectedServices.map(s => s.id),
        staffId: selectedStaff?.id || null,
        bedId: selectedRoomType ? 1 : null // Mocking bed for now
      });
      setIsBooked(true);
    } catch (err) {
      showValidationMessage('Đặt lịch thất bại: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const updateProductQuantity = (productId, delta) => {
    setSelectedProducts(prev => prev.map(p => {
      if (p.id === productId) {
        const newQty = Math.max(1, (p.quantity || 1) + delta);
        return { ...p, quantity: newQty };
      }
      return p;
    }));
  };

  const toggleProduct = (product) => {
    setSelectedProducts(prev => {
      const exists = prev.find(p => p.id === product.id);
      if (exists) return prev.filter(p => p.id !== product.id);
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const totalPrice = (basePrice * roomMultiplier) + selectedProducts.reduce((sum, p) => sum + (Number(p.price) * (p.quantity || 1)), 0);

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
        <h2 className="text-4xl font-serif mb-4">Đặt lịch thành công!</h2>
        <p className="text-[#475569] mb-10 leading-relaxed">Không gian thư giãn của bạn đã sẵn sàng. Chúng tôi rất mong được đón tiếp bạn.</p>
        <button onClick={() => navigate('/')} className="btn-primary px-12 py-4">Về trang chủ</button>
      </motion.div>
    </div>
  );

  return (
    <div className="booking-page pt-32 pb-20">
      {/* Toast Notification */}
      <AnimatePresence>
        {errorMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] w-full max-w-md px-4"
          >
            <div className="bg-red-50 border-l-4 border-red-500 p-5 rounded-2xl shadow-2xl flex items-center gap-4 backdrop-blur-md">
              <div className="bg-red-500 text-white rounded-full p-2">
                <Info size={18} />
              </div>
              <div className="flex-1">
                <h4 className="text-red-800 font-bold text-sm">Cần thao tác</h4>
                <p className="text-red-600 text-xs mt-1">{errorMessage}</p>
              </div>
              <button onClick={() => setErrorMessage('')} className="text-red-400 hover:text-red-600 transition-colors">
                <Plus size={20} className="rotate-45" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="container max-w-5xl">
        <div className="text-center mb-12">
          <h2 className="text-sm uppercase tracking-[0.3em] text-[#d4af37] font-bold mb-2">Trải nghiệm Lumina</h2>
          <h1 className="text-4xl font-serif">Đặt lịch trị liệu</h1>
        </div>
        
        {/* Progress Stepper */}
        <div className="flex justify-between mb-16 relative px-4">
          <div className="absolute top-1/2 left-0 w-full h-0.5 bg-gray-100 -translate-y-1/2 z-0" />
          {steps.map((s) => (
            <div key={s.id} className="relative z-10 flex flex-col items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 font-bold ${step >= s.id ? 'bg-[#064e3b] text-white' : 'bg-white text-gray-400 border-2'}`}>
                {step > s.id ? <CheckCircle size={18} /> : s.id}
              </div>
              <span className={`text-[10px] mt-3 font-bold uppercase tracking-widest ${step >= s.id ? 'text-[#064e3b]' : 'text-gray-400'}`}>{s.title}</span>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-12">
          {/* Main Form Area */}
          <div className="lg:col-span-2">
            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div key="step1" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }}>
                  <h3 className="text-3xl font-serif mb-8">Chọn dịch vụ của bạn</h3>
                  <div className="grid gap-4">
                    {services.map(service => (
                      <div 
                        key={service.id}
                        onClick={() => {
                          setSelectedServices(prev => 
                            prev.find(s => s.id === service.id) ? prev.filter(s => s.id !== service.id) : [...prev, service]
                          );
                        }}
                        className={`p-6 rounded-3xl border-2 transition-all cursor-pointer flex justify-between items-center ${selectedServices.find(s => s.id === service.id) ? 'border-[#d4af37] bg-[#d4af3711] shadow-[0_0_15px_rgba(212,175,55,0.2)]' : 'border-gray-100 bg-white hover:border-gray-200'}`}
                      >
                        <div>
                          <h4 className="font-bold text-lg">{service.name}</h4>
                          <p className="text-sm text-gray-500">{service.durationMinutes} phút • {service.price.toLocaleString()}đ</p>
                        </div>
                        {selectedServices.find(s => s.id === service.id) ? <CheckCircle className="text-[#d4af37]" /> : <Plus className="text-gray-300" />}
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div key="step2" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }}>
                  <h3 className="text-3xl font-serif mb-8">Thời gian & Chuyên viên</h3>
                  <div className="space-y-8">
                    <div>
                      <label className="block text-sm font-bold uppercase tracking-widest text-gray-400 mb-4">Chọn ngày & Giờ</label>
                      <div className="grid sm:grid-cols-2 gap-4">
                        <input 
                          type="date" 
                          className="input-field" 
                          style={{ border: selectedDate ? '2px solid #064e3b' : '2px solid #f1f5f9' }}
                          value={selectedDate}
                          onChange={(e) => setSelectedDate(e.target.value)}
                        />
                        <input 
                          type="time" 
                          className="input-field" 
                          style={{ border: selectedTime ? '2px solid #064e3b' : '2px solid #f1f5f9' }}
                          value={selectedTime}
                          onChange={(e) => setSelectedTime(e.target.value)}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-bold uppercase tracking-widest text-gray-400 mb-4">Chọn Kỹ thuật viên (Tùy chọn)</label>
                      <div className="grid sm:grid-cols-2 gap-4">
                        {staffs.map(staff => (
                          <div 
                            key={staff.id}
                            onClick={() => setSelectedStaff(selectedStaff?.id === staff.id ? null : staff)}
                            className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${selectedStaff?.id === staff.id ? 'border-[#064e3b] bg-[#f0fdf4] shadow-[0_0_15px_rgba(6,78,59,0.1)]' : 'border-gray-100 hover:border-gray-200'}`}
                          >
                            <h5 className="font-bold">{staff.fullName}</h5>
                            <p className="text-xs text-gray-500 uppercase">{staff.position}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div key="step3" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }}>
                  <h3 className="text-3xl font-serif mb-8">Phong cách phòng</h3>
                  <p className="text-gray-500 mb-8">Nâng tầm sự riêng tư và thoải mái bằng cách chọn loại phòng mong muốn.</p>
                  <div className="grid gap-6">
                    {roomTypes.map(rt => (
                      <div 
                        key={rt.id}
                        onClick={() => setSelectedRoomType(selectedRoomType?.id === rt.id ? null : rt)}
                        className={`p-8 rounded-[2rem] border-2 cursor-pointer transition-all ${selectedRoomType?.id === rt.id ? 'border-[#d4af37] bg-[#fcfaf8] shadow-[0_10px_30px_rgba(212,175,55,0.15)] ring-2 ring-[#d4af37]' : 'border-gray-100 hover:border-gray-200'}`}
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <h4 className="text-xl font-bold mb-2">{rt.name}</h4>
                            <p className="text-sm text-gray-500">{rt.description}</p>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] uppercase font-bold text-[#d4af37] block mb-1">Hệ số giá</span>
                            <span className="text-2xl font-serif text-[#064e3b]">x{rt.priceMultiplier}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {step === 4 && (
                <motion.div key="step4" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }}>
                  <h3 className="text-3xl font-serif mb-2">Sản phẩm đi kèm</h3>
                  <p className="text-gray-500 mb-10">Những khách hàng thường đặt dịch vụ này cũng rất thích các sản phẩm dưới đây.</p>
                  <div className="grid sm:grid-cols-2 gap-6">
                    {products.map(product => {
                      const selProd = selectedProducts.find(p => p.id === product.id);
                      return (
                        <div key={product.id} className={`glass p-6 rounded-3xl flex gap-4 items-center border-2 transition-all ${selProd ? 'border-[#064e3b] bg-[#f0fdf4]' : 'border-transparent'}`}>
                          <img src={product.imageUrl || "https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&q=40&w=100"} className="w-16 h-16 rounded-xl object-cover" />
                          <div className="flex-1">
                            <h5 className="font-bold text-sm">{product.name}</h5>
                            <p className="text-[#064e3b] font-bold">{product.price.toLocaleString()}đ</p>
                          </div>
                          
                          {selProd ? (
                            <div className="flex flex-col items-center gap-2">
                              <div className="flex items-center gap-3 bg-white p-1 rounded-full border">
                                <button onClick={() => updateProductQuantity(product.id, -1)} className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-gray-100">-</button>
                                <span className="font-bold text-sm">{selProd.quantity}</span>
                                <button onClick={() => updateProductQuantity(product.id, 1)} className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-gray-100">+</button>
                              </div>
                              <button onClick={() => toggleProduct(product)} className="text-red-400 text-xs font-bold">Xóa</button>
                            </div>
                          ) : (
                            <button 
                              onClick={() => toggleProduct(product)}
                              className="bg-[#064e3b] text-white p-3 rounded-full hover:scale-110 transition-transform"
                            >
                              <Plus size={16} />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <button onClick={() => setStep(5)} className="mt-12 text-[#064e3b] font-bold flex items-center gap-2 hover:gap-4 transition-all">
                    Tôi chỉ cần dịch vụ đã chọn <ArrowRight size={18} />
                  </button>
                </motion.div>
              )}

              {step === 5 && (
                <motion.div key="step5" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }}>
                  <h3 className="text-3xl font-serif mb-8">Xác nhận thông tin</h3>
                  <div className="space-y-6">
                    <div className="flex items-start gap-4 p-6 bg-[#fcfaf8] rounded-3xl border border-[#d4af3733]">
                      <Info className="text-[#d4af37]" />
                      <div>
                        <p className="font-bold text-[#064e3b]">Lịch trình dự kiến</p>
                        <p className="text-sm text-gray-600">
                          {new Date(selectedDate).toLocaleDateString('vi-VN')} • {selectedTime} <br />
                          Thời gian dự kiến: {totalServiceDuration} phút
                        </p>
                      </div>
                    </div>
                    {selectedStaff && (
                      <p className="px-6 text-sm">Chuyên viên yêu cầu: <span className="font-bold text-[#064e3b]">{selectedStaff.fullName}</span></p>
                    )}
                    <div className="border-t pt-6 px-6">
                      <label className="flex items-center gap-3 cursor-pointer group">
                        <input type="checkbox" className="w-6 h-6 accent-[#064e3b]" id="agree-checkbox" />
                        <span className="text-sm text-gray-600 group-hover:text-black transition-colors">Tôi đồng ý với chính sách đặt hủy và quy định của Spa.</span>
                      </label>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Navigation Buttons */}
            <div className="mt-16 flex justify-between px-4">
              {step > 1 ? (
                <button onClick={() => setStep(step - 1)} className="btn-outline flex items-center gap-2">
                  <ChevronLeft size={18} /> Quay lại
                </button>
              ) : <div />}
              
              {step < 5 ? (
                <button 
                  onClick={handleNext} 
                  className="btn-primary px-8"
                >
                  Tiếp tục <ChevronRight size={18} />
                </button>
              ) : (
                <button 
                  onClick={handleBooking} 
                  disabled={submitting} 
                  className="btn-primary px-10 relative overflow-hidden group"
                >
                  {submitting ? (
                    <Loader2 className="animate-spin" size={20} />
                  ) : (
                    <span className="flex items-center gap-2">Xác nhận đặt lịch • {totalPrice.toLocaleString()}đ <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" /></span>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Sidebar Summary */}
          <div className="lg:col-span-1">
            <div className="glass p-8 rounded-[2.5rem] sticky top-32 shadow-xl border border-white">
              <h4 className="text-xl font-serif mb-6 border-b pb-4">Tóm tắt đơn hàng</h4>
              
              <div className="space-y-4 mb-8 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                {selectedServices.map(s => (
                  <div key={s.id} className="flex justify-between text-sm">
                    <span className="text-gray-600">{s.name}</span>
                    <span className="font-bold">{s.price.toLocaleString()}đ</span>
                  </div>
                ))}
                {selectedRoomType && (
                  <div className="flex justify-between text-sm py-2 border-t border-[#d4af37]/20">
                    <span className="text-[#d4af37] font-medium">{selectedRoomType.name} (Hệ số)</span>
                    <span className="font-bold">x{selectedRoomType.priceMultiplier}</span>
                  </div>
                )}
                {selectedProducts.map(p => (
                  <div key={p.id} className="flex justify-between text-sm text-green-700">
                    <span>{p.name} {p.quantity > 1 ? `(x${p.quantity})` : ''}</span>
                    <span className="font-bold">{(p.price * p.quantity).toLocaleString()}đ</span>
                  </div>
                ))}
              </div>

              {selectedServices.length === 0 && (
                <p className="text-xs text-center text-gray-400 mb-8 italic">Chưa có dịch vụ nào được chọn.</p>
              )}

              <div className="border-t-2 border-dashed pt-6 flex justify-between items-end">
                <span className="text-gray-400 text-xs italic">Tổng cộng</span>
                <span className="text-3xl font-serif text-[#064e3b]">{totalPrice.toLocaleString()}đ</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Booking;
