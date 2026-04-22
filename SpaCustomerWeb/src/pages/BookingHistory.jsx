import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar, 
  Clock, 
  User as UserIcon, 
  CheckCircle, 
  Loader2, 
  ChevronRight, 
  Info, 
  History,
  AlertCircle,
  Edit,
  XCircle,
  Search,
  Package,
  Star,
  MessageSquare
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getMyAppointments, cancelAppointment, submitReview } from '../services/api';

const BookingHistory = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, pending, done, cancelled
  const [reviewModal, setReviewModal] = useState(null); // stores the appointment being reviewed
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  
  const navigate = useNavigate();
  const customerId = localStorage.getItem('spa_customer_id');

  const fetchHistory = async () => {
    if (!customerId) {
        setLoading(false);
        return;
    }
    try {
      const data = await getMyAppointments(customerId);
      setAppointments(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleCancel = async (id) => {
    if (!window.confirm("Bạn có chắc chắn muốn hủy lịch hẹn này không?")) return;
    try {
      await cancelAppointment(id);
      fetchHistory();
    } catch (err) {
      alert("Lỗi khi hủy: " + err.message);
    }
  };

  const handleReviewSubmit = async () => {
    if (!comment.trim()) {
        alert("Vui lòng nhập nhận xét của bạn.");
        return;
    }
    setSubmittingReview(true);
    try {
      await submitReview({
        customerId: parseInt(customerId),
        serviceId: reviewModal.appointmentDetails[0]?.serviceId || null,
        rating: rating,
        comment: comment,
        createdAt: new Date().toISOString()
      });
      alert("Cảm ơn bạn đã đánh giá!");
      setReviewModal(null);
      setComment('');
      setRating(5);
    } catch (err) {
      alert("Gửi đánh giá thất bại: " + err.message);
    } finally {
      setSubmittingReview(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Pending': return { bg: '#fff7ed', text: '#9a3412', label: 'Chờ xác nhận' };
      case 'Assigned': return { bg: '#eff6ff', text: '#1e40af', label: 'Đã phân công' };
      case 'Done': return { bg: '#f0fdf4', text: '#166534', label: 'Đã hoàn tất' };
      case 'Cancelled': return { bg: '#fef2f2', text: '#991b1b', label: 'Đã hủy' };
      default: return { bg: '#f8fafc', text: '#475569', label: status };
    }
  };

  const filtered = appointments.filter(a => {
    if (filter === 'all') return true;
    return a.status.toLowerCase() === filter.toLowerCase();
  });

  if (loading) return (
    <div className="pt-40 flex items-center justify-center min-h-[60vh]">
      <Loader2 className="animate-spin text-[#064e3b]" size={48} />
    </div>
  );

  return (
    <div className="history-page pt-32 pb-20 min-h-screen bg-[#fdfbf9]">
      <div className="container max-w-5xl">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
          <div>
            <h2 className="text-sm uppercase tracking-[0.3em] text-[#d4af37] font-bold mb-2 flex items-center gap-2">
                <History size={16} /> Hành trình của bạn
            </h2>
            <h1 className="text-4xl font-serif">Lịch sử đặt lịch</h1>
          </div>
          
          <div className="flex bg-white/50 backdrop-blur-md p-1.5 rounded-2xl border border-white shadow-sm self-start">
            {['all', 'Pending', 'Done'].map(f => (
              <button 
                key={f}
                onClick={() => setFilter(f)}
                className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${filter === f ? 'bg-[#064e3b] text-white shadow-lg' : 'text-[#64748b] hover:bg-white'}`}
              >
                {f === 'all' ? 'Tất cả' : (f === 'Pending' ? 'Đang chờ' : 'Đã xong')}
              </button>
            ))}
          </div>
        </div>

        {!customerId ? (
            <div className="text-center py-20 glass rounded-[3rem]">
                <AlertCircle size={48} className="mx-auto mb-4 text-[#94a3b8]" />
                <p className="text-[#64748b] mb-6">Bạn cần đăng nhập để xem lịch sử.</p>
                <button onClick={() => navigate('/login')} className="btn-primary px-8 py-3">Đăng nhập ngay</button>
            </div>
        ) : filtered.length === 0 ? (
            <div className="text-center py-32 glass rounded-[3rem] border-dashed">
                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Search size={32} className="text-gray-300" />
                </div>
                <h3 className="text-xl font-serif mb-2">Chưa có lịch hẹn nào</h3>
                <p className="text-[#94a3b8] mb-8">Hãy bắt đầu hành trình thư giãn của bạn ngay hôm nay.</p>
                <button onClick={() => navigate('/booking')} className="btn-primary px-10 py-4">Đặt lịch ngay</button>
            </div>
        ) : (
            <div className="grid gap-6">
                {filtered.map((app, idx) => {
                    const status = getStatusColor(app.status);
                    const canEdit = app.status === 'Pending';
                    const isDone = app.status === 'Done';
                    const dateObj = new Date(app.appointmentDate);

                    return (
                        <motion.div 
                            key={app.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-50 hover:shadow-xl hover:border-[#d4af3722] transition-all group"
                        >
                            <div className="flex flex-col lg:flex-row justify-between gap-8">
                                <div className="flex-1 space-y-6">
                                    <div className="flex items-center gap-4">
                                        <div className="px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest" style={{ backgroundColor: status.bg, color: status.text }}>
                                            {status.label}
                                        </div>
                                        <span className="text-xs text-gray-400 font-medium">Mã lịch: #{app.id}</span>
                                    </div>

                                    <div className="grid md:grid-cols-2 gap-6">
                                        <div className="flex items-start gap-4">
                                            <div className="p-3 bg-gray-50 rounded-2xl text-[#064e3b]">
                                                <Calendar size={20} />
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-400 uppercase font-bold tracking-tighter mb-1">Thời gian</p>
                                                <p className="font-bold text-[#1e293b]">{dateObj.toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                                                <p className="text-sm text-[#64748b] flex items-center gap-1"><Clock size={14} /> {dateObj.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-start gap-4">
                                            <div className="p-3 bg-gray-50 rounded-2xl text-[#064e3b]">
                                                <UserIcon size={20} />
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-400 uppercase font-bold tracking-tighter mb-1">Chuyên viên</p>
                                                <p className="font-bold text-[#1e293b]">{app.staff?.fullName || "Hệ thống sẽ chỉ định"}</p>
                                                {app.bed && <p className="text-sm text-[#d4af37] font-medium italic">{app.bed.bedName} • {app.bed.room?.roomName}</p>}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-4 border-t border-gray-50">
                                        <p className="text-xs text-gray-400 uppercase font-bold mb-3 flex items-center gap-2">
                                            <Package size={14} /> Dịch vụ trị liệu
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                            {app.appointmentDetails?.map(detail => (
                                                <span key={detail.id} className="bg-gray-50/80 px-4 py-2 rounded-xl text-sm font-medium text-[#475569]">
                                                    {detail.service?.name}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="lg:w-48 flex flex-col justify-between gap-4">
                                    <div className="bg-[#fcfaf8] p-6 rounded-[2rem] text-center border border-[#d4af3711]">
                                        <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Tổng cộng</p>
                                        <p className="text-2xl font-serif text-[#064e3b]">
                                            {app.appointmentDetails?.reduce((s,d) => s + d.price, 0).toLocaleString()}đ
                                        </p>
                                    </div>

                                    <div className="space-y-3">
                                        {canEdit && (
                                            <button 
                                                onClick={() => navigate('/booking', { state: { edit: app } })}
                                                className="w-full py-3.5 rounded-2xl bg-white border border-[#064e3b] text-[#064e3b] font-bold text-sm flex items-center justify-center gap-2 hover:bg-[#064e3b] hover:text-white transition-all shadow-sm"
                                            >
                                                <Edit size={16} /> Thay đổi
                                            </button>
                                        )}
                                        {isDone && (
                                            <button 
                                                onClick={() => setReviewModal(app)}
                                                className="w-full py-3.5 rounded-2xl bg-[#d4af37] text-white font-bold text-sm flex items-center justify-center gap-2 hover:bg-[#b8952e] transition-all shadow-md"
                                            >
                                                <Star size={16} /> Đánh giá
                                            </button>
                                        )}
                                        {app.status !== 'Cancelled' && app.status !== 'Done' && (
                                            <button 
                                                onClick={() => handleCancel(app.id)}
                                                className="w-full py-3.5 rounded-2xl text-red-500 font-bold text-sm flex items-center justify-center gap-2 hover:bg-red-50 transition-all"
                                            >
                                                <XCircle size={16} /> Hủy lịch
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </div>
        )}

        <div className="mt-12 p-8 bg-[#064e3b]/5 rounded-[2.5rem] border border-[#064e3b]/10">
            <div className="flex gap-4 items-start">
                <Info className="text-[#064e3b] shrink-0 mt-1" />
                <p className="text-sm text-[#064e3b]/70 leading-relaxed">
                    <strong>Chính sách thay đổi:</strong> Bạn có thể tự do thay đổi dịch vụ, nhân viên hoặc thời gian nếu lịch hẹn vẫn ở trạng thái <strong>"Chờ xác nhận"</strong>. Một khi lịch hẹn đã được nhân viên chuẩn bị (Đã phân công), vui lòng liên hệ hotline để được hỗ trợ.
                </p>
            </div>
        </div>
      </div>

      {/* Review Modal */}
      <AnimatePresence>
        {reviewModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
            <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setReviewModal(null)} 
            />
            <motion.div 
                initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="bg-white rounded-[3rem] p-10 max-w-lg w-full relative z-10 shadow-2xl"
            >
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-[#d4af3711] text-[#d4af37] rounded-full flex items-center justify-center mx-auto mb-4">
                        <MessageSquare size={32} />
                    </div>
                    <h3 className="text-2xl font-serif">Cảm nhận của bạn</h3>
                    <p className="text-gray-500 text-sm mt-2">Ý kiến của bạn giúp Lumina Spa hoàn thiện hơn mỗi ngày.</p>
                </div>

                <div className="space-y-6">
                    <div className="text-center">
                        <p className="text-xs uppercase font-bold text-gray-400 mb-3">Mức độ hài lòng</p>
                        <div className="flex justify-center gap-2">
                            {[1, 2, 3, 4, 5].map(s => (
                                <button key={s} onClick={() => setRating(s)} className="transition-transform hover:scale-125">
                                    <Star size={32} fill={s <= rating ? '#d4af37' : 'none'} color={s <= rating ? '#d4af37' : '#e2e8f0'} />
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <textarea 
                            className="w-full h-32 p-4 rounded-2xl bg-gray-50 border-none outline-none focus:ring-2 focus:ring-[#d4af37] transition-all text-sm"
                            placeholder="Chia sẻ trải nghiệm của bạn về dịch vụ, nhân viên và không gian..."
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                        />
                    </div>

                    <button 
                        onClick={handleReviewSubmit}
                        disabled={submittingReview}
                        className="btn-primary w-full py-4 flex items-center justify-center gap-2 shadow-lg"
                    >
                        {submittingReview ? <Loader2 className="animate-spin" size={20} /> : 'Gửi đánh giá ngay'}
                    </button>
                    <button onClick={() => setReviewModal(null)} className="w-full text-gray-400 text-sm font-bold">Để sau</button>
                </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default BookingHistory;
