import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Phone, Mail, Award, Check, Save, Loader2 } from 'lucide-react';
import { getCustomer, updateCustomer } from '../services/api';

const Profile = () => {
    const customerId = localStorage.getItem('spa_customer_id');
    const [customer, setCustomer] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        fullName: '',
        phoneNumber: '',
        email: ''
    });

    useEffect(() => {
        if (customerId) {
            fetchCustomer();
        }
    }, [customerId]);

    const fetchCustomer = async () => {
        try {
            const data = await getCustomer(customerId);
            setCustomer(data);
            setFormData({
                fullName: data.fullName || '',
                phoneNumber: data.phoneNumber || '',
                email: data.email || ''
            });
        } catch (err) {
            console.error("Failed to fetch profile", err);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await updateCustomer(customerId, {
                ...customer,
                ...formData
            });
            alert("Đã cập nhật thông tin thành công!");
            fetchCustomer();
        } catch (err) {
            alert("Có lỗi xảy ra: " + err.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return (
        <div className="flex justify-center items-center h-screen">
            <Loader2 className="animate-spin text-[#064e3b]" size={40} />
        </div>
    );

    const getRankColor = (rank) => {
        switch(rank) {
            case 'Silver': return 'text-slate-400';
            case 'Gold': return 'text-yellow-600';
            case 'Platinum': return 'text-indigo-600';
            default: return 'text-orange-700';
        }
    };

    const getRankIcon = (rank) => {
        switch(rank) {
            case 'Silver': return <Award className="text-slate-400" size={32} />;
            case 'Gold': return <Award className="text-yellow-600" size={32} />;
            case 'Platinum': return <Award className="text-indigo-600" size={32} />;
            default: return <Award className="text-orange-700" size={32} />;
        }
    };

    return (
        <div className="section-padding min-h-screen bg-[#fcfaf8]">
            <div className="container max-w-4xl">
                <div className="grid md:grid-cols-3 gap-10">
                    
                    {/* Member Card */}
                    <div className="md:col-span-1">
                        <motion.div 
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-[#f3e5ab] relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 w-32 h-32 bg-[#d4af37]/10 rounded-full -mr-16 -mt-16" />
                            <div className="relative z-10 flex flex-col items-center">
                                <div className="w-24 h-24 bg-[#064e3b] rounded-full flex items-center justify-center text-white text-3xl font-serif mb-6 shadow-lg">
                                    {customer?.fullName?.charAt(0)}
                                </div>
                                <h2 className="text-xl font-bold mb-1">{customer?.fullName}</h2>
                                <p className="text-sm text-gray-500 mb-6 italic">Thành viên từ {new Date().getFullYear()}</p>
                                
                                <div className={`flex flex-col items-center p-4 rounded-2xl w-full bg-[#fdfbf9] border border-dashed mb-4`}>
                                    {getRankIcon(customer?.rank)}
                                    <span className={`font-black tracking-widest uppercase mt-2 ${getRankColor(customer?.rank)}`}>
                                        {customer?.rank || 'Standard'}
                                    </span>
                                </div>

                                <div className="w-full space-y-3">
                                    <div className="flex justify-between text-xs">
                                        <span className="text-gray-400 uppercase tracking-tighter">Điểm tích lũy</span>
                                        <span className="font-bold">{customer?.loyaltyPoint?.points || 0} pts</span>
                                    </div>
                                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-[#d4af37]" 
                                            style={{ width: `${Math.min((customer?.loyaltyPoint?.points || 0) / 50, 100)}%` }} 
                                        />
                                    </div>
                                    <p className="text-[10px] text-gray-400 text-center italic">
                                        Cần {(customer?.loyaltyPoint?.points < 500 ? 500 : customer?.loyaltyPoint?.points < 2000 ? 2000 : 5000) - (customer?.loyaltyPoint?.points || 0)} điểm nữa để thăng hạng.
                                    </p>
                                </div>
                            </div>
                        </motion.div>

                        <div className="mt-8 space-y-4">
                            <h3 className="font-serif text-lg px-4 italic">Quyền lợi của bạn:</h3>
                            {[
                                { rank: 'Silver', benefit: 'Giảm giá 5% tất cả dịch vụ' },
                                { rank: 'Gold', benefit: 'Giảm giá 10% tất cả dịch vụ' },
                                { rank: 'Platinum', benefit: 'Giảm giá 15% tất cả dịch vụ' }
                            ].map((b, i) => (
                                <div key={i} className={`flex items-center gap-3 p-3 rounded-xl ${customer?.rank === b.rank ? 'bg-[#064e3b]/10 text-[#064e3b]' : 'opacity-40 grayscale'}`}>
                                    <Check size={16} />
                                    <span className="text-sm">{b.benefit}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Form Edit */}
                    <div className="md:col-span-2">
                        <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-gray-100"
                        >
                            <h1 className="text-3xl font-serif mb-8">Thông tin cá nhân</h1>
                            
                            <form onSubmit={handleUpdate} className="space-y-6">
                                <div className="grid sm:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-600 flex items-center gap-2">
                                            <User size={16} /> Họ và tên
                                        </label>
                                        <input 
                                            type="text" 
                                            value={formData.fullName}
                                            onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                                            className="w-full p-4 rounded-2xl bg-gray-50 border-none focus:ring-2 focus:ring-[#064e3b] outline-none"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-600 flex items-center gap-2">
                                            <Phone size={16} /> Số điện thoại
                                        </label>
                                        <input 
                                            type="tel" 
                                            value={formData.phoneNumber}
                                            onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})}
                                            className="w-full p-4 rounded-2xl bg-gray-50 border-none focus:ring-2 focus:ring-[#064e3b] outline-none"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-600 flex items-center gap-2">
                                        <Mail size={16} /> Email
                                    </label>
                                    <input 
                                        type="email" 
                                        value={formData.email}
                                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                                        className="w-full p-4 rounded-2xl bg-gray-50 border-none focus:ring-2 focus:ring-[#064e3b] outline-none"
                                        required
                                    />
                                </div>

                                <motion.button 
                                    whileTap={{ scale: 0.95 }}
                                    disabled={saving}
                                    type="submit"
                                    className="btn-primary w-full py-5 rounded-2xl flex items-center justify-center gap-2"
                                >
                                    {saving ? <Loader2 className="animate-spin" /> : <Save size={20} />}
                                    Lưu thay đổi
                                </motion.button>
                            </form>
                        </motion.div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default Profile;
