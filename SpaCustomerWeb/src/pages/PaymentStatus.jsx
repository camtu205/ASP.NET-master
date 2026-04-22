import React, { useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Home, Calendar, ArrowRight } from 'lucide-react';

const PaymentStatus = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    
    const status = searchParams.get('status');
    const orderId = searchParams.get('orderId');
    const appointmentId = searchParams.get('appointmentId');
    
    const isSuccess = status === 'success';

    return (
        <div className="min-h-[80vh] flex items-center justify-center section-padding bg-[#fcfaf8]">
            <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="max-w-md w-full bg-white p-10 rounded-[3rem] shadow-2xl text-center border border-[#f3e5ab]"
            >
                <div className="flex justify-center mb-8">
                    {isSuccess ? (
                        <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                            <CheckCircle size={64} strokeWidth={1.5} />
                        </div>
                    ) : (
                        <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center text-red-600">
                            <XCircle size={64} strokeWidth={1.5} />
                        </div>
                    )}
                </div>

                <h1 className="text-3xl font-serif mb-4">
                    {isSuccess ? 'Thanh toán thành công!' : 'Thanh toán thất bại'}
                </h1>
                
                <p className="text-gray-500 mb-10 leading-relaxed">
                    {isSuccess 
                        ? `Cảm ơn bạn đã sử dụng dịch vụ của chúng tôi. Mã đơn hàng của bạn là #${orderId || appointmentId}. Lịch hẹn của bạn đã được xác nhận tự động.`
                        : 'Rất tiếc, đã có lỗi xảy ra trong quá trình thanh toán. Vui lòng thử lại hoặc liên hệ với bộ phận hỗ trợ.'}
                </p>

                <div className="space-y-4">
                    <Link 
                        to={isSuccess ? "/history" : "/booking"}
                        className="btn-primary w-full py-4 rounded-2xl flex items-center justify-center gap-2"
                    >
                        {isSuccess ? (
                            <>
                                <Calendar size={20} />
                                Xem lịch hẹn của tôi
                            </>
                        ) : (
                            <>
                                <Calendar size={20} />
                                Thử đặt lịch lại
                            </>
                        )}
                        <ArrowRight size={16} />
                    </Link>

                    <Link 
                        to="/"
                        className="w-full py-4 rounded-2xl border border-gray-200 text-gray-600 font-bold hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                    >
                        <Home size={20} />
                        Về trang chủ
                    </Link>
                </div>

                {isSuccess && (
                    <div className="mt-8 pt-8 border-t border-dashed border-gray-200">
                        <p className="text-xs text-gray-400 italic">
                            Một email xác nhận đã được gửi đến hòm thư của bạn. <br/>
                            Vui lòng đến đúng giờ để có trải nghiệm tốt nhất.
                        </p>
                    </div>
                )}
            </motion.div>
        </div>
    );
};

export default PaymentStatus;
