const BASE_URL = 'https://asp-net-master.onrender.com/api';

export const getImageUrl = (url) => {
  if (!url) return 'https://placehold.co/400x500?text=Ctus+Spa';
  if (url.startsWith('http')) return url;
  return BASE_URL.replace('/api', '') + (url.startsWith('/') ? url : '/' + url);
};

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

export const getMyOrders = (customerId) => apiFetch(`/Orders/MyOrders?customerId=${customerId}`);

export const getProfile = () => apiFetch('/Auth/Profile');

export const getNotifications = () => apiFetch('/Notifications');
export const markAllNotificationsRead = () => apiFetch('/Notifications/read-all', {
  method: 'POST',
});

export const api = {
  getNotifications,
  markAllNotificationsRead,
  get: (endpoint) => apiFetch(endpoint),
  post: (endpoint, data) => apiFetch(endpoint, { method: 'POST', body: JSON.stringify(data) }),
  put: (endpoint, data) => apiFetch(endpoint, { method: 'PUT', body: JSON.stringify(data) }),
};

export default api;
