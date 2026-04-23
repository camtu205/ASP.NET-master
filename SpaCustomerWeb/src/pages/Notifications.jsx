import React, { useEffect, useState } from 'react';
import { getNotifications, markAllNotificationsRead } from '../services/api';

const Notifications = () => {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchNotifications();
    }, []);

    const fetchNotifications = async () => {
        try {
            const data = await getNotifications();
            setNotifications(data);
            // Mark all as read
            await markAllNotificationsRead();
        } catch (err) {
            console.error("Lỗi lấy thông báo:", err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="p-10 text-center">Đang tải...</div>;

    return (
        <div className="container mx-auto p-4 max-w-2xl">
            <h1 className="text-2xl font-bold mb-6">Thông báo của bạn</h1>
            <div className="space-y-4">
                {notifications.length === 0 ? (
                    <div className="bg-white p-10 rounded-2xl shadow-sm text-center text-gray-500">
                        Bạn chưa có thông báo nào.
                    </div>
                ) : (
                    notifications.map(n => (
                        <div key={n.id} className={`p-4 rounded-2xl shadow-sm border-l-4 ${n.isRead ? 'bg-gray-50 border-gray-300' : 'bg-white border-pink-400'}`}>
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="font-semibold text-pink-600">{n.title}</h3>
                                <span className="text-xs text-gray-400">{new Date(n.createdDate).toLocaleString()}</span>
                            </div>
                            <p className="text-gray-700 text-sm">{n.message}</p>
                            {n.targetType === 'Appointment' && (
                                <button 
                                    onClick={() => window.location.href = '/history'} 
                                    className="mt-3 text-xs font-bold text-pink-500 hover:underline flex items-center gap-1"
                                >
                                    Xem lịch hẹn của bạn →
                                </button>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default Notifications;
