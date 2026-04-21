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
