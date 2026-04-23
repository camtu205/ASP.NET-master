const BASE_URL = 'https://asp-net-master.onrender.com/api';

export const apiFetch = async (endpoint, options = {}) => {
  const token = localStorage.getItem('spa_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...options.headers,
  };

  const url = `${BASE_URL}${endpoint}${endpoint.includes('?') ? '&' : '?'}_t=${new Date().getTime()}`;
  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = response.statusText || 'API Request failed';
    try {
      const errorData = JSON.parse(errorText);
      errorMessage = errorData.message || errorData.title || errorMessage;
    } catch (e) {
      errorMessage = errorText || errorMessage;
    }
    throw new Error(errorMessage);
  }

  return response.status === 204 ? null : response.json();
};

export const login = (credentials) => apiFetch('/Auth/Login', {
  method: 'POST',
  body: JSON.stringify(credentials),
});

export const register = (userData) => apiFetch('/Auth/Register', {
  method: 'POST',
  body: JSON.stringify(userData),
});

export const getServices = () => apiFetch('/Services');
export const getProducts = () => apiFetch('/Product');
export const getStaffs = () => apiFetch('/Staffs');
export const getRoomTypes = () => apiFetch('/RoomTypes');
export const bookAppointment = (data) => apiFetch('/Appointments/Book', {
  method: 'POST',
  body: JSON.stringify(data),
});

export const getMyAppointments = (customerId) => apiFetch(`/Appointments/MyAppointments?customerId=${customerId}`);

export const updateAppointment = (id, data) => apiFetch(`/Appointments/${id}`, {
  method: 'PUT',
  body: JSON.stringify(data),
});

export const cancelAppointment = (id) => apiFetch(`/Appointments/${id}`, {
  method: 'DELETE',
});

export const getReviews = () => apiFetch('/Reviews');

export const submitReview = (reviewData) => apiFetch('/Reviews', {
  method: 'POST',
  body: JSON.stringify(reviewData),
});

export const getCustomer = (id) => apiFetch(`/Customers/${id}`);

export const updateCustomer = (id, data) => apiFetch(`/Customers/${id}`, {
  method: 'PUT',
  body: JSON.stringify(data),
});

export const getNotifications = () => apiFetch('/Notifications');
export const markAllNotificationsRead = () => apiFetch('/Notifications/read-all', {
  method: 'POST',
});

const api = {
  getNotifications,
  markAllNotificationsRead,
  // add others if needed
};

export default api;
