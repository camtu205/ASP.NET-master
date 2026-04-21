const BASE_URL = 'https://asp-net-master.onrender.com/api';

export const apiFetch = async (endpoint, options = {}) => {
  const token = localStorage.getItem('spa_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...options.headers,
  };

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || response.statusText || 'API Request failed');
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
export const bookAppointment = (data) => apiFetch('/Appointments', {
  method: 'POST',
  body: JSON.stringify(data),
});
