/**
 * Ctus Spa CRM - Frontend Logic
 * Updated: 17/04/2026 - v2 (Button Fix)
 */

// Cấu hình URL Backend: Thay đổi URL Render của bạn tại đây khi deploy
const RENDER_EXTERNAL_URL = 'https://asp-net-master.onrender.com'; 

const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? '/api'
    : RENDER_EXTERNAL_URL + '/api';

// Fallback if Render URL is not updated
if (!RENDER_EXTERNAL_URL.includes('onrender.com')) {
    console.error('RENDER_EXTERNAL_URL is not set correctly in app.js');
}

// --- State Management ---
const state = {
    token: localStorage.getItem('crm_token') || null,
    user: null, 
    activeSection: 'dashboard'
};

// --- Utils ---
function parseJwt(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        const payload = JSON.parse(jsonPayload);
        return {
            username: payload["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"] || payload["sub"],
            role: payload["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"] || payload["role"],
            id: payload["UserId"]
        };
    } catch (e) { return null; }
}

function toLocalISOString(date) {
    const tzOffset = date.getTimezoneOffset() * 60000; // offset in milliseconds
    const localISOTime = (new Date(date - tzOffset)).toISOString().slice(0, 16);
    return localISOTime;
}

// --- API Helper ---
async function apiCall(endpoint, method = 'GET', body = null, retries = 2) {
    const headers = { 'Content-Type': 'application/json' };
    if (state.token) headers['Authorization'] = `Bearer ${state.token}`;

    const options = { method, headers };
    if (body) options.body = JSON.stringify(body);

    try {
        const response = await fetch(`${API_BASE}${endpoint}`, options);
        if (response.status === 401) { handleLogout(); throw new Error('Hết phiên làm việc.'); }
        if (!response.ok) {
            let errorText = await response.text();
            let msg = errorText;
            try { msg = JSON.parse(errorText).message || errorText; } catch(e) {}
            const err = new Error(msg || 'Lỗi hệ thống');
            err.status = response.status;
            throw err;
        }
        return response.status !== 204 ? await response.json() : null;
    } catch (err) {
        // Thử lại nếu lỗi mạng (ERR_NETWORK_CHANGED, Failed to fetch)
        if (retries > 0 && (err.name === 'TypeError' || err.message.includes('fetch'))) {
            console.warn(`Retrying... (${3 - retries})`, endpoint);
            await new Promise(r => setTimeout(r, 1000)); // Chờ 1s rồi thử lại
            return apiCall(endpoint, method, body, retries - 1);
        }

        if (err.message !== 'Hết phiên làm việc.') showToast(err.message, 'error');
        throw err;
    }
}

function getFullUrl(url) {
    if (!url) return 'https://placehold.co/100';
    if (url.startsWith('http')) return url;
    // Nếu là đường dẫn tương đối (bắt đầu bằng /), nối với base API URL (bỏ phần /api)
    return API_BASE.replace('/api', '') + (url.startsWith('/') ? url : '/' + url);
}

async function uploadFile(file) {
    if (!file) return null;
    const fd = new FormData();
    fd.append('file', file);
    
    const headers = {};
    if (state.token) headers['Authorization'] = `Bearer ${state.token}`;
    
    const response = await fetch(`${API_BASE}/Uploads`, {
        method: 'POST',
        headers,
        body: fd
    });
    
    if (!response.ok) throw new Error('Lỗi tải ảnh lên');
    const result = await response.json();
    return result.url;
}

// --- Auth ---
let isSubmitting = false;
async function handleLogin(e) {
    if (e) e.preventDefault();
    if (isSubmitting) return;
    
    console.log('--- LOGIN START ---');
    isSubmitting = true;
    try {
        const username = document.getElementById('username')?.value;
        const password = document.getElementById('password')?.value;
        
        console.log('Username:', username);
        if (!username || !password) {
            showToast('Vui lòng nhập đầy đủ thông tin', 'error');
            isSubmitting = false;
            return;
        }

        console.log('Sending request to:', `${API_BASE}/Auth/Login`);
        const result = await apiCall('/Auth/Login', 'POST', { username, password });
        console.log('Login Result Keys:', Object.keys(result));

        state.token = result.token || result.Token;
        
        if (!state.token) {
            console.error('SERVER RESPONSE ERROR: No token field found');
            showToast('Lỗi: Server không trả về Token', 'error');
            isSubmitting = false;
            return;
        }

        localStorage.setItem('crm_token', state.token);
        console.log('Token saved, switching UI...');
        
        await initApp();
    } catch (err) {
        console.error('CRITICAL LOGIN ERROR:', err);
        alert('Lỗi đăng nhập: ' + err.message);
        showToast(err.message || 'Lỗi đăng nhập', 'error');
    } finally {
        isSubmitting = false;
    }
}

async function handleRegister(e) {
    if (e) e.preventDefault();
    try {
        const username = document.getElementById('username')?.value;
        const password = document.getElementById('password')?.value;
        const role = document.getElementById('role')?.value;

        await apiCall('/Auth/Register', 'POST', { username, password, role });
        showToast('Đăng ký thành công! Vui lòng đăng nhập.');
        switchAuthTab('login');
    } catch (err) {
        showToast(err.message || 'Lỗi đăng ký', 'error');
    }
}

function handleLogout() {
    state.token = null;
    state.user = null;
    localStorage.removeItem('crm_token');
    document.getElementById('auth-overlay').classList.remove('hidden');
    document.getElementById('main-sidebar').classList.add('hidden');
}

// --- UI Utils ---
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastMsg = document.getElementById('toast-message');
    const toastIcon = document.getElementById('toast-icon');
    
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        info: 'fa-info-circle'
    };

    toastMsg.textContent = message;
    toastIcon.className = `fas ${icons[type] || icons.info}`;
    toast.className = `toast ${type} show`;
    
    setTimeout(() => toast.classList.remove('show'), 3000);
}

function switchAuthTab(tab) {
    const isLogin = tab === 'login';
    document.getElementById('tab-login').classList.toggle('active', isLogin);
    document.getElementById('tab-register').classList.toggle('active', !isLogin);
    document.getElementById('group-role').classList.toggle('hidden', isLogin);
    document.getElementById('auth-submit').textContent = isLogin ? 'Bắt đầu ngay' : 'Tạo tài khoản';
}

// --- CRUD Core ---
// --- Validation ---
function clearErrors(form) {
    form.querySelectorAll('.error-text').forEach(e => e.remove());
    form.querySelectorAll('.input-error').forEach(e => e.classList.remove('input-error'));
}

function showError(input, message) {
    input.classList.add('input-error');
    const err = document.createElement('div');
    err.className = 'error-text';
    err.textContent = message;
    input.parentNode.appendChild(err);
}

function validateData(form, data) {
    clearErrors(form);
    let isValid = true;

    if (data.fullName !== undefined && (!data.fullName || data.fullName.trim() === '')) {
        showError(form.fullName, 'Họ tên không được để trống.');
        isValid = false;
    }
    if (data.name !== undefined && (!data.name || data.name.trim() === '')) {
        showError(form.name, 'Tên không được để trống.');
        isValid = false;
    }
    if (data.phoneNumber && !/^0\d{9}$/.test(data.phoneNumber)) {
        showError(form.phoneNumber, 'Số điện thoại phải bắt đầu bằng số 0 và có 10 chữ số.');
        isValid = false;
    }
    if (data.email && !data.email.includes('@')) {
        showError(form.email, 'Email không hợp lệ.');
        isValid = false;
    }
    if (data.price !== undefined && (isNaN(data.price) || data.price < 0)) {
        showError(form.price, 'Giá tiền không được nhỏ hơn 0.');
        isValid = false;
    }
    if (data.discountPercent !== undefined && (isNaN(data.discountPercent) || data.discountPercent < 0 || data.discountPercent > 100)) {
        showError(form.pct || form.discountPercent, 'Khuyến mãi phải từ 0% đến 100%.');
        isValid = false;
    }
    if (data.totalSessions !== undefined && (isNaN(data.totalSessions) || data.totalSessions <= 0)) {
        showError(form.totalSessions, 'Tổng số buổi phải lớn hơn 0.');
        isValid = false;
    }
    if ((data.durationMinutes !== undefined && (isNaN(data.durationMinutes) || data.durationMinutes <= 0)) ||
        (data.durationPerSession !== undefined && (isNaN(data.durationPerSession) || data.durationPerSession <= 0))) {
        showError(form.duration, 'Thời gian phải lớn hơn 0.');
        isValid = false;
    }
    if (data.stockQuantity !== undefined && (isNaN(data.stockQuantity) || data.stockQuantity < 0)) {
        showError(form.stock, 'Số lượng tồn kho không được nhỏ hơn 0.');
        isValid = false;
    }
    
    if (!isValid) showToast('Vui lòng kiểm tra lại thông tin!', 'error');
    return isValid;
}

window.deleteItem = async (endpoint, id, name) => {
    if (!confirm(`Xóa "${name}"?`)) return;
    try {
        await apiCall(`${endpoint}/${id}`, 'DELETE');
        showToast('Đã xóa!');
        renderers[state.activeSection]();
    } catch (e) {}
};

window.openEditModal = (type, id) => openCRUDModal(type, id);

async function openCRUDModal(type, id = null) {
    const isEdit = id !== null;
    const modal = document.getElementById('edit-modal');
    const fields = document.getElementById('modal-fields');
    const form = document.getElementById('edit-form');
    const title = document.getElementById('modal-title');
    
    const typeLabels = {
        customer: 'Khách hàng',
        staff: 'Nhân viên',
        service: 'Dịch vụ',
        product: 'Sản phẩm',
        promotion: 'Khuyến mãi',
        treatment: 'Liệu trình',
        customerTreatment: 'Liệu trình khách hàng',
        roomType: 'Loại phòng',
        room: 'Phòng',
        bed: 'Giường'
    };
    title.textContent = (isEdit ? 'Chỉnh sửa ' : 'Thêm mới ') + (typeLabels[type] || 'thông tin');
    modal.classList.remove('hidden');
    
    let data = { id: '', fullName: '', phoneNumber: '', email: '', position: '', name: '', price: 0, durationMinutes: 60, stockQuantity: 100, discountPercent: 0, totalSessions: 10, durationPerSession: 60, priceMultiplier: 1.0, roomName: '', bedName: '', status: 'Available' };
    if (isEdit) {
        const ep = type === 'product' ? '/Product' : (['treatment', 'customerTreatment', 'roomType', 'room', 'bed'].includes(type) ? `/${type.charAt(0).toUpperCase() + type.slice(1) + 's'}` : `/${type.charAt(0).toUpperCase() + type.slice(1) + 's'}`);
        data = await apiCall(`${ep}/${id}`);
    }
    
    let html = isEdit ? `<input type="hidden" name="id" value="${data.id}">` : '';
    if (type === 'customer' || type === 'staff') {
        html += `
            <div class="input-group"><label>Họ tên</label><input type="text" name="fullName" value="${data.fullName}" placeholder="Nhập họ tên..."></div>
            <div class="input-group"><label>Số điện thoại</label><input type="text" name="phoneNumber" value="${data.phoneNumber}" placeholder="09xxxxxxx"></div>
            <div class="input-group"><label>Email</label><input type="email" name="email" value="${data.email || ''}" placeholder="email@example.com"></div>
            ${type === 'staff' ? `
            <div class="input-group"><label>Vị trí</label>
                <select name="position">
                    <option value="Kỹ thuật viên" ${data.position === 'Kỹ thuật viên' ? 'selected' : ''}>Kỹ thuật viên</option>
                    <option value="Chuyên viên tư vấn" ${data.position === 'Chuyên viên tư vấn' ? 'selected' : ''}>Chuyên viên tư vấn</option>
                    <option value="Lễ tân" ${data.position === 'Lễ tân' ? 'selected' : ''}>Lễ tân</option>
                    <option value="Quản lý" ${data.position === 'Quản lý' ? 'selected' : ''}>Quản lý</option>
                    <option value="Tạp vụ" ${data.position === 'Tạp vụ' ? 'selected' : ''}>Tạp vụ</option>
                </select>
            </div>` : ''}
        `;
    } else if (type === 'service') {
        html += `
            <div class="input-group"><label>Tên dịch vụ</label><input type="text" name="name" value="${data.name}" placeholder="Tên dịch vụ..."></div>
            <div class="input-group"><label>Giá (VNĐ)</label><input type="number" name="price" value="${data.price}"></div>
            <div class="input-group"><label>Thời gian (phút)</label><input type="number" name="durationMinutes" value="${data.durationMinutes}"></div>
            <div class="input-group">
                <label>Hình ảnh</label>
                ${data.imageUrl ? `<img src="${getFullUrl(data.imageUrl)}" style="width:100px; height:100px; object-fit:cover; border-radius:8px; margin-bottom:10px; border:1px solid #ddd">` : ''}
                <input type="file" name="imageFile" accept="image/*">
            </div>
        `;
    } else if (type === 'product') {
        html += `
            <div class="input-group"><label>Tên sản phẩm</label><input type="text" name="name" value="${data.name}"></div>
            <div class="input-group"><label>Giá (VNĐ)</label><input type="number" name="price" value="${data.price}"></div>
            <div class="input-group"><label>Tồn kho</label><input type="number" name="stockQuantity" value="${data.stockQuantity}"></div>
            <div class="input-group">
                <label>Hình ảnh</label>
                ${data.imageUrl ? `<img src="${getFullUrl(data.imageUrl)}" style="width:100px; height:100px; object-fit:cover; border-radius:8px; margin-bottom:10px; border:1px solid #ddd">` : ''}
                <input type="file" name="imageFile" accept="image/*">
            </div>
        `;
    } else if (type === 'promotion') {
        const services = await apiCall('/Services');
        const currentAppIds = data.applicableServiceIds ? data.applicableServiceIds.split(',').filter(x => x) : [];
        html += `
            <div class="input-group"><label>Tên CTKM</label><input type="text" name="name" value="${data.name || ''}" required></div>
            <div class="input-group"><label>Giảm (%)</label><input type="number" name="pct" value="${data.discountPercent || 0}" required></div>
            <div class="input-group"><label>Số lần dùng tối đa</label><input type="number" name="maxUsage" value="${data.maxUsage || ''}" placeholder="Để trống nếu không giới hạn"></div>
            <div class="input-group"><label>Dịch vụ áp dụng</label>
                <div class="checkbox-list">
                    <label class="checkbox-item">
                        <input type="checkbox" name="applicableServices" value="ALL" ${!data.applicableServiceIds || data.applicableServiceIds === 'ALL' ? 'checked' : ''} onchange="const others = this.closest('.checkbox-list').querySelectorAll('.service-checkbox'); if(this.checked) others.forEach(c => c.checked = false)">
                        <strong>Tất cả dịch vụ</strong>
                    </label>
                    ${services.map(s => `
                        <label class="checkbox-item">
                            <input type="checkbox" name="applicableServices" value="${s.id}" ${currentAppIds.includes(s.id.toString()) ? 'checked' : ''} class="service-checkbox" onchange="if(this.checked) this.closest('.checkbox-list').querySelector('input[value=\'ALL\']').checked = false">
                            ${s.name}
                        </label>
                    `).join('')}
                </div>
            </div>
            <div class="form-row">
                <div class="input-group"><label>Ngày bắt đầu</label><input type="date" name="startDate" value="${new Date(data.startDate || Date.now()).toISOString().split('T')[0]}" required></div>
                <div class="input-group"><label>Ngày kết thúc</label><input type="date" name="endDate" value="${new Date(data.endDate || (Date.now() + 7*24*3600*1000)).toISOString().split('T')[0]}" required></div>
            </div>
        `;
    } else if (type === 'treatment') {
        const services = await apiCall('/Services');
        const currentServiceIds = data.serviceIds ? data.serviceIds.split(',').filter(x => x) : [];
        html += `
            <div class="input-group"><label>Tên liệu trình</label><input type="text" name="name" value="${data.name}" required></div>
            <div class="input-group"><label>Tổng số buổi</label><input type="number" name="totalSessions" value="${data.totalSessions}" required></div>
            <div class="input-group"><label>Giá trọn gói (VNĐ)</label><input type="number" name="price" value="${data.price}" required></div>
            <div class="input-group"><label>Thời gian/buổi (phút)</label><input type="number" name="duration" value="${data.durationPerSession || 60}" required></div>
            <div class="input-group"><label>Dịch vụ bao gồm (Chọn nhiều)</label>
                <div class="checkbox-list">
                    ${services.map(s => `
                        <label class="checkbox-item">
                            <input type="checkbox" name="treatmentServices" value="${s.id}" ${currentServiceIds.includes(s.id.toString()) ? 'checked' : ''}>
                            ${s.name}
                        </label>
                    `).join('')}
                </div>
            </div>
        `;
    } else if (type === 'customerTreatment') {
        const [customers, treatments] = await Promise.all([apiCall('/Customers'), apiCall('/Treatments')]);
        html += `
            <div class="input-group"><label>Khách hàng</label><select name="customerId" required>${customers.map(c => `<option value="${c.id}" ${c.id === data.customerId ? 'selected' : ''}>${c.fullName}</option>`).join('')}</select></div>
            <div class="input-group"><label>Liệu trình</label><select name="treatmentId" required>${treatments.map(t => `<option value="${t.id}" ${t.id === data.treatmentId ? 'selected' : ''}>${t.name} (${t.totalSessions} buổi)</option>`).join('')}</select></div>
            <div class="input-group"><label>Trạng thái</label><select name="status"><option value="Active" ${data.status === 'Active' ? 'selected' : ''}>Đang thực hiện</option><option value="Completed" ${data.status === 'Completed' ? 'selected' : ''}>Đã xong</option><option value="Cancelled" ${data.status === 'Cancelled' ? 'selected' : ''}>Đã hủy</option></select></div>
        `;
    } else if (type === 'roomType') {
        html += `
            <div class="input-group"><label>Tên loại phòng</label><input type="text" name="name" value="${data.name || ''}" required></div>
            <div class="input-group"><label>Mô tả</label><input type="text" name="desc" value="${data.description || ''}"></div>
            <div class="input-group"><label>Hệ số giá</label><input type="number" step="0.1" name="multiplier" value="${data.priceMultiplier || 1.0}"></div>
        `;
    } else if (type === 'room') {
        const types = await apiCall('/RoomTypes');
        html += `
            <div class="input-group"><label>Tên phòng</label><input type="text" name="roomName" value="${data.roomName || ''}" required></div>
            <div class="input-group"><label>Loại phòng</label><select name="roomTypeId">${types.map(t => `<option value="${t.id}" ${t.id === data.roomTypeId ? 'selected' : ''}>${t.name}</option>`).join('')}</select></div>
            <div class="input-group"><label>Trạng thái</label><select name="status"><option value="Available" ${data.status==='Available'?'selected':''}>Sẵn sàng</option><option value="Occupied" ${data.status==='Occupied'?'selected':''}>Đang sử dụng</option><option value="Maintenance" ${data.status==='Maintenance'?'selected':''}>Bảo trì</option></select></div>
        `;
    } else if (type === 'appointment') {
        const [staffs, beds] = await Promise.all([apiCall('/Staffs'), apiCall('/Beds')]);
        html += `
            <div style="background:linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); padding:20px; border-radius:16px; margin-bottom:25px; border:1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05)">
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:15px; margin-bottom:15px">
                    <div class="info-item">
                        <small style="color:#64748b; text-transform:uppercase; font-weight:700; font-size:10px; display:block; margin-bottom:4px">Khách hàng</small>
                        <span style="font-weight:600; color:#1e293b; font-size:1.1rem">${data.customer?.fullName || 'N/A'}</span>
                    </div>
                    <div class="info-item">
                        <small style="color:#64748b; text-transform:uppercase; font-weight:700; font-size:10px; display:block; margin-bottom:4px">Ngày hẹn</small>
                        <span style="font-weight:600; color:#1e293b">${new Date(data.appointmentDate).toLocaleString('vi-VN')}</span>
                    </div>
                    <div class="info-item">
                        <small style="color:#64748b; text-transform:uppercase; font-weight:700; font-size:10px; display:block; margin-bottom:4px">Giá dịch vụ</small>
                        <span style="font-weight:700; color:var(--primary); font-size:1.2rem">${data.totalPrice?.toLocaleString() || 0}đ</span>
                    </div>
                    <div class="info-item">
                        <small style="color:#64748b; text-transform:uppercase; font-weight:700; font-size:10px; display:block; margin-bottom:4px">Trạng thái</small>
                        <span class="badge badge-${data.status.toLowerCase()}" style="font-size:12px; padding:6px 12px">${data.status}</span>
                    </div>
                </div>
                <div style="padding-top:15px; border-top:1px solid #e2e8f0">
                    <small style="color:#64748b; text-transform:uppercase; font-weight:700; font-size:10px; display:block; margin-bottom:4px">Dịch vụ thực hiện</small>
                    <div style="display:flex; flex-wrap:wrap; gap:8px; margin-top:8px">
                        ${data.appointmentDetails?.map(d => `<span style="background:white; padding:4px 10px; border-radius:6px; border:1px solid #e2e8f0; font-size:13px; font-weight:500; color:#334155">${d.service?.name}</span>`).join('') || '<span style="color:#94a3b8">N/A</span>'}
                    </div>
                </div>
            </div>
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:20px">
                <div class="input-group">
                    <label style="font-weight:600">Trạng thái xử lý</label>
                    <select name="status" style="border-radius:10px">
                        <option value="Pending" ${data.status === 'Pending' ? 'selected' : ''}>Chờ xác nhận</option>
                        <option value="Assigned" ${data.status === 'Assigned' ? 'selected' : ''}>Đã phân công</option>
                        <option value="Done" ${data.status === 'Done' ? 'selected' : ''}>Đã hoàn tất</option>
                        <option value="Cancelled" ${data.status === 'Cancelled' ? 'selected' : ''}>Đã hủy</option>
                    </select>
                </div>
                <div class="input-group">
                    <label style="font-weight:600">Kỹ thuật viên</label>
                    <select name="staffId" style="border-radius:10px">
                        <option value="">-- Chọn nhân viên --</option>
                        ${staffs.map(s => `<option value="${s.id}" ${data.staffId === s.id ? 'selected' : ''}>${s.fullName}</option>`).join('')}
                    </select>
                </div>
            </div>
            <div class="input-group">
                <label style="font-weight:600">Giường & Phòng</label>
                <select name="bedId" style="border-radius:10px">
                    <option value="">-- Chọn giường --</option>
                    ${beds.map(b => `<option value="${b.id}" ${data.bedId === b.id ? 'selected' : ''}>${b.bedName} (${b.room?.roomName} - ${b.room?.roomType?.name})</option>`).join('')}
                </select>
            </div>
        `;
    } else if (type === 'order') {
        html += `
            <div style="background:white; padding:30px; border-radius:20px; box-shadow:0 10px 25px rgba(0,0,0,0.05); border:1px solid #f1f5f9; font-family:'Inter', sans-serif">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:30px; border-bottom:2px solid #f8fafc; padding-bottom:20px">
                    <div>
                        <h2 style="color:var(--primary); font-size:1.8rem; margin:0">HÓA ĐƠN</h2>
                        <span style="color:#94a3b8; font-size:0.9rem; font-weight:500">Mã đơn: #${data.id}</span>
                    </div>
                    <div style="text-align:right">
                        <div style="font-weight:700; color:#1e293b">Ctus Spa & Beauty</div>
                        <div style="color:#64748b; font-size:0.8rem">Ngày: ${new Date(data.orderDate).toLocaleDateString('vi-VN')}</div>
                    </div>
                </div>
                
                <div style="margin-bottom:30px">
                    <small style="color:#94a3b8; text-transform:uppercase; font-weight:700; letter-spacing:1px; font-size:11px">Khách hàng</small>
                    <div style="font-size:1.2rem; font-weight:700; color:#1e293b; margin-top:5px">${data.customer?.fullName || 'Khách hàng'}</div>
                    <div style="color:#64748b; font-size:0.9rem">${data.customer?.phoneNumber || ''}</div>
                </div>

                <table style="width:100%; border-collapse:collapse; margin-bottom:30px">
                    <thead>
                        <tr style="text-align:left; color:#94a3b8; font-size:12px; text-transform:uppercase; border-bottom:1px solid #f1f5f9">
                            <th style="padding:15px 0">Mô tả dịch vụ/Sản phẩm</th>
                            <th style="padding:15px 0; text-align:right">Thành tiền</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.orderDetails?.map(d => `
                            <tr style="border-bottom:1px solid #f8fafc">
                                <td style="padding:15px 0; font-weight:600; color:#334155">${d.service?.name || d.product?.name || 'Sản phẩm/Dịch vụ'}</td>
                                <td style="padding:15px 0; text-align:right; font-weight:600; color:#1e293b">${d.price.toLocaleString()}đ</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>

                <div style="background:#f8fafc; padding:20px; border-radius:12px">
                    <div style="display:flex; justify-content:space-between; margin-bottom:10px; color:#64748b; font-size:0.9rem">
                        <span>Tạm tính:</span>
                        <span>${data.totalAmount.toLocaleString()}đ</span>
                    </div>
                    <div style="display:flex; justify-content:space-between; font-size:1.4rem; font-weight:800; color:var(--primary); padding-top:10px; border-top:1px dashed #cbd5e1">
                        <span>TỔNG CỘNG:</span>
                        <span>${data.totalAmount.toLocaleString()}đ</span>
                    </div>
                </div>

                <div style="margin-top:30px; display:flex; gap:15px; justify-content:center">
                    <button type="button" class="btn-primary" onclick="window.print()" style="padding:10px 25px; border-radius:10px; display:flex; align-items:center; gap:8px">
                        <i class="fas fa-print"></i> In hóa đơn
                    </button>
                </div>
            </div>
        `;
    } else if (type === 'bed') {
        const rooms = await apiCall('/Rooms');
        html += `
            <div class="input-group"><label>Tên giường</label><input type="text" name="bedName" value="${data.bedName || ''}" required></div>
            <div class="input-group"><label>Thuộc phòng</label><select name="roomId">${rooms.map(r => `<option value="${r.id}" ${r.id === data.roomId ? 'selected' : ''}>${r.roomName}</option>`).join('')}</select></div>
            <div class="input-group"><label>Trạng thái</label><select name="status"><option value="Available" ${data.status==='Available'?'selected':''}>Sẵn sàng</option><option value="InUse" ${data.status==='InUse'?'selected':''}>Đang sử dụng</option><option value="Maintenance" ${data.status==='Maintenance'?'selected':''}>Bảo trì</option></select></div>
        `;
    }

    fields.innerHTML = html;
    form.onsubmit = async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        
        let endpoint = `/${type.charAt(0).toUpperCase() + type.slice(1)}s`;
        if (type === 'product') endpoint = '/Product';
        if (type === 'appointment') endpoint = '/Appointments';
        if (type === 'order') endpoint = '/Orders';

        const method = isEdit ? 'PUT' : 'POST';
        const url = isEdit ? `${API_BASE}${endpoint}/${data.id}` : `${API_BASE}${endpoint}`;

        try {
            showToast('Đang xử lý...', 'info');

            let response;
            if (['service', 'product'].includes(type)) {
                // Đối với Service và Product, gửi trực tiếp FormData để backend xử lý IFormFile [FromForm]
                const headers = {};
                if (state.token) headers['Authorization'] = `Bearer ${state.token}`;
                
                response = await fetch(url, {
                    method,
                    headers,
                    body: fd
                });
            } else {
                // Các loại khác vẫn dùng JSON như cũ
                let body = isEdit ? { id: data.id } : {};
                
                if (type === 'customer') body = {...body, fullName: fd.get('fullName'), phoneNumber: fd.get('phoneNumber'), email: fd.get('email')};
                if (type === 'staff') body = {...body, fullName: fd.get('fullName'), phoneNumber: fd.get('phoneNumber'), position: fd.get('position'), email: fd.get('email')};
                if (type === 'promotion') {
                    const appServices = fd.getAll('applicableServices');
                    const appIds = appServices.includes('ALL') ? 'ALL' : (appServices.length > 0 ? (',' + appServices.join(',') + ',') : 'ALL');
                    body = {...body, name: fd.get('name'), discountPercent: parseFloat(fd.get('pct')), maxUsage: fd.get('maxUsage') ? parseInt(fd.get('maxUsage')) : null, applicableServiceIds: appIds, startDate: fd.get('startDate'), endDate: fd.get('endDate') };
                }
                if (type === 'treatment') {
                    const selectedServices = fd.getAll('treatmentServices');
                    body = { ...body, name: fd.get('name'), totalSessions: parseInt(fd.get('totalSessions')), price: parseFloat(fd.get('price')), durationPerSession: parseInt(fd.get('duration')), serviceIds: selectedServices.length > 0 ? (',' + selectedServices.join(',') + ',') : null };
                }
                if (type === 'customerTreatment') body = {...body, customerId: parseInt(fd.get('customerId')), treatmentId: parseInt(fd.get('treatmentId')), status: fd.get('status')};
                if (type === 'roomType') body = {...body, name: fd.get('name'), description: fd.get('desc'), priceMultiplier: parseFloat(fd.get('multiplier'))};
                if (type === 'room') body = {...body, roomName: fd.get('roomName'), roomTypeId: parseInt(fd.get('roomTypeId')), status: fd.get('status')};
                if (type === 'bed') body = {...body, bedName: fd.get('bedName'), roomId: parseInt(fd.get('roomId')), status: fd.get('status')};
                if (type === 'appointment') body = { ...body, status: fd.get('status'), staffId: fd.get('staffId') ? parseInt(fd.get('staffId')) : null, bedId: fd.get('bedId') ? parseInt(fd.get('bedId')) : null };

                if (!validateData(e.target, body)) return;

                const headers = { 'Content-Type': 'application/json' };
                if (state.token) headers['Authorization'] = `Bearer ${state.token}`;
                
                response = await fetch(url, {
                    method,
                    headers,
                    body: JSON.stringify(body)
                });
            }

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || 'Lỗi hệ thống');
            }

            modal.classList.add('hidden');
            showToast(isEdit ? 'Đã cập nhật!' : 'Đã thêm thành công!');
            if (renderers[state.activeSection]) renderers[state.activeSection]();
        } catch (err) {
            console.error(err);
            showToast(err.message, 'error');
        }
    };
};

// --- Renderers ---
const renderers = {
    dashboard: async () => {
        const [customers, apps, orders, services] = await Promise.all([
            apiCall('/Customers'), 
            apiCall('/Appointments'), 
            apiCall('/Orders'),
            apiCall('/Services')
        ]);

        const totalRevenue = orders.reduce((s, x) => s + x.totalAmount, 0);
        const pendingApps = apps.filter(x => x.status === 'Pending' || x.status === 'Assigned').length;
        
        // Calculate Revenue by Day (Last 7 Days)
        const revenueByDay = {};
        const labels = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
            labels.push(dateStr);
            revenueByDay[dateStr] = 0;
        }

        orders.forEach(o => {
            const d = new Date(o.orderDate).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
            if (revenueByDay[d] !== undefined) {
                revenueByDay[d] += o.totalAmount;
            }
        });

        const revenueData = Object.values(revenueByDay);
        const maxRevenue = Math.max(...revenueData);
        const peakDay = labels[revenueData.indexOf(maxRevenue)];

        // Popular Services
        const serviceCounts = {};
        orders.forEach(o => {
            o.orderDetails?.forEach(d => {
                if (d.serviceId) {
                    serviceCounts[d.serviceId] = (serviceCounts[d.serviceId] || 0) + 1;
                }
            });
        });

        const popularServices = Object.entries(serviceCounts)
            .map(([id, count]) => ({
                name: services.find(s => s.id == id)?.name || 'Dịch vụ ẩn',
                count
            }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);

        document.getElementById('section-container').innerHTML = `
            <div class="card-grid">
                <div class="stat-card revenue">
                    <span class="label">Tổng doanh thu</span>
                    <span class="value">${totalRevenue.toLocaleString()}đ</span>
                    <div class="trend up"><i class="fas fa-arrow-up"></i> 12% so với tháng trước</div>
                </div>
                <div class="stat-card appointments">
                    <span class="label">Lịch hẹn mới</span>
                    <span class="value">${pendingApps}</span>
                    <div class="trend ${pendingApps > 5 ? 'up' : 'down'}"><i class="fas fa-calendar"></i> Cần xử lý</div>
                </div>
                <div class="stat-card customers">
                    <span class="label">Khách hàng</span>
                    <span class="value">${customers.length}</span>
                    <div class="trend up"><i class="fas fa-user-plus"></i> +${customers.filter(c => new Date(c.createdAt || Date.now()) > new Date(Date.now() - 7*24*3600*1000)).length} tuần này</div>
                </div>
            </div>

            <div class="dashboard-grid">
                <div class="chart-card">
                    <div class="chart-header">
                        <h3>Biểu đồ doanh thu (7 ngày qua)</h3>
                        <span class="badge badge-active" style="background:#f0fdf4; color:#166534">Đỉnh điểm: ${peakDay}</span>
                    </div>
                    <canvas id="revenueChart" height="250"></canvas>
                </div>

                <div class="chart-card">
                    <div class="chart-header">
                        <h3><i class="fas fa-crown" style="color:#d4af37"></i> Dịch vụ yêu thích</h3>
                    </div>
                    <div class="popular-list">
                        ${popularServices.length > 0 ? popularServices.map((s, i) => `
                            <div class="popular-item">
                                <div class="popular-info">
                                    <span class="popular-name">${s.name}</span>
                                    <span class="popular-count">${s.count} lượt sử dụng</span>
                                </div>
                                <div class="popular-rank">${i + 1}</div>
                            </div>
                        `).join('') : '<p class="text-gray" style="text-align:center; padding:20px">Chưa có dữ liệu dịch vụ</p>'}
                    </div>
                    <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #f3f4f6">
                        <div style="display:flex; justify-content:space-between; font-size:0.85rem">
                            <span style="color:var(--text-gray)">Ngày cao nhất:</span>
                            <span style="font-weight:700; color:var(--success)">${maxRevenue.toLocaleString()}đ</span>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Initialize Chart
        const ctx = document.getElementById('revenueChart').getContext('2d');
        const gradient = ctx.createLinearGradient(0, 0, 0, 250);
        gradient.addColorStop(0, 'rgba(16, 185, 129, 0.2)');
        gradient.addColorStop(1, 'rgba(16, 185, 129, 0)');

        new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Doanh thu',
                    data: revenueData,
                    borderColor: '#10B981',
                    backgroundColor: gradient,
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#fff',
                    pointBorderColor: '#10B981',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                layout: { padding: { top: 10, bottom: 10 } },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: '#1e293b',
                        padding: 12,
                        titleFont: { size: 14, weight: 'bold' },
                        bodyFont: { size: 13 },
                        displayColors: false,
                        callbacks: {
                            label: (context) => `Doanh thu: ${context.raw.toLocaleString()}đ`
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: '#f1f5f9', drawBorder: false },
                        ticks: {
                            color: '#94a3b8',
                            font: { size: 11 },
                            callback: (v) => v >= 1000000 ? (v/1000000)+'M' : (v >= 1000 ? (v/1000)+'K' : v)
                        }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { color: '#94a3b8', font: { size: 11 } }
                    }
                }
            }
        });
    },

    commonList: async (type, title, endpoint, cols, mapper) => {
        const list = await apiCall(endpoint);
        const isAdmin = state.user?.role === 'Admin';
        const isStaff = state.user?.role === 'Staff';
        
        // Quyết định ai được quyền Thêm/Sửa/Xóa dựa trên yêu cầu:
        // "nhân viên không được thêm nhân viên, chỉ admin được xóa hóa đơn"
        const canManage = isAdmin || (isStaff && ['appointment', 'checkout', 'customerTreatment'].includes(type));
        
        document.getElementById('section-container').innerHTML = `
            <div class="table-controls">
                <input type="text" class="input-search" placeholder="Tìm kiếm ${title.toLowerCase()}...">
                ${canManage ? `<button class="btn-primary" onclick="window.addItem('${type}')" style="width:auto">+ Thêm ${title}</button>` : ''}
            </div>
            <table><thead><tr>${cols.map(c => `<th>${c}</th>`).join('')}${canManage ? '<th style="text-align:right">Thao tác</th>' : ''}</tr></thead>
            <tbody>${list.map(item => `<tr>${mapper(item)}${canManage ? `
                <td style="text-align:right">
                    <button class="btn-edit" onclick="openEditModal('${type}', ${item.id})"><i class="fas fa-edit"></i></button>
                    <button class="btn-danger" onclick="deleteItem('${endpoint}', ${item.id}, '${item.name || item.fullName}')"><i class="fas fa-trash"></i></button>
                </td>` : ''}</tr>`).join('')}</tbody></table>
        `;
    },

    customers: () => renderers.commonList('customer', 'Khách hàng', '/Customers', ['ID', 'Họ tên', 'SĐT', 'Hạng', 'Email'], i => `
        <td>#${i.id}</td>
        <td><strong>${i.fullName}</strong></td>
        <td>${i.phoneNumber}</td>
        <td><span class="badge badge-${(i.rank || 'Standard').toLowerCase()}">${i.rank || 'Standard'}</span></td>
        <td>${i.email || ''}</td>
    `),
    
    staffs: () => renderers.commonList('staff', 'Nhân viên', '/Staffs', ['ID', 'Họ tên', 'SĐT', 'Vị trí', 'Email'], i => `<td>#${i.id}</td><td><strong>${i.fullName}</strong></td><td>${i.phoneNumber}</td><td>${i.position || ''}</td><td>${i.email || ''}</td>`),
    
    services: () => renderers.commonList('service', 'Dịch vụ', '/Services', ['ID', 'Ảnh', 'Tên dịch vụ', 'Giá', 'Thời gian'], i => `
        <td>#${i.id}</td>
        <td><img src="${i.imageUrl || 'https://placehold.co/50'}" style="width:40px; height:40px; object-fit:cover; border-radius:6px; border:1px solid #eee"></td>
        <td><strong>${i.name}</strong></td>
        <td>${i.price.toLocaleString()}đ</td>
        <td>${i.durationMinutes} phút</td>
    `),
    
    products: () => renderers.commonList('product', 'Sản phẩm', '/Product', ['ID', 'Ảnh', 'Tên sản phẩm', 'Giá', 'Tồn kho'], i => `
        <td>#${i.id}</td>
        <td><img src="${getFullUrl(i.imageUrl)}" style="width:40px; height:40px; object-fit:cover; border-radius:6px; border:1px solid #eee"></td>
        <td><strong>${i.name}</strong></td>
        <td>${i.price.toLocaleString()}đ</td>
        <td>${i.stockQuantity}</td>
    `),
    
    promotions: () => renderers.commonList('promotion', 'Khuyến mãi', '/Promotions', ['ID', 'Tên CTKM', 'Giảm %', 'Áp dụng', 'Lượt dùng', 'Thời hạn'], i => `
        <td>#${i.id}</td>
        <td><strong>${i.name}</strong></td>
        <td>${i.discountPercent}%</td>
        <td><span class="badge badge-pending" style="font-size:10px">${i.applicableServiceIds === 'ALL' || !i.applicableServiceIds ? 'Tất cả dịch vụ' : 'Một số DV'}</span></td>
        <td>${i.maxUsage ? `${i.orders?.length || 0}/${i.maxUsage}` : '∞'}</td>
        <td style="font-size:11px">${new Date(i.startDate).toLocaleDateString()} - ${new Date(i.endDate).toLocaleDateString()}</td>
    `),

    treatments: () => renderers.commonList('treatment', 'Liệu trình', '/Treatments', ['ID', 'Tên liệu trình', 'Số buổi', 'Giá'], i => `<td>#${i.id}</td><td><strong>${i.name}</strong></td><td>${i.totalSessions} buổi</td><td>${i.price.toLocaleString()}đ</td>`),

    customerTreatments: async () => {
        const ct = await apiCall('/CustomerTreatments');
        renderers.commonList('customerTreatment', 'Liệu trình của khách', '/CustomerTreatments', ['Khách hàng', 'Liệu trình', 'Số buổi còn', 'Trạng thái'], item => `
            <td><strong>${item.customer?.fullName || 'N/A'}</strong></td>
            <td>${item.treatment?.name || 'N/A'}</td>
            <td><span class="badge badge-pending">${item.remainingSessions}/${item.treatment?.totalSessions || '?'}</span></td>
            <td><span class="badge badge-${item.status.toLowerCase()}">${item.status}</span></td>
            ${item.status === 'Active' ? `<td><button class="btn-edit" onclick="renderers.showSessionForm(${item.id})">Ghi buổi mới</button></td>` : '<td></td>'}
        `);
    },

    showSessionForm: async (ctId) => {
        const staffs = await apiCall('/Staffs');
        const modal = document.getElementById('edit-modal');
        const fields = document.getElementById('modal-fields');
        const title = document.getElementById('modal-title');
        title.textContent = "Ghi nhận buổi thực hiện";
        modal.classList.remove('hidden');
        fields.innerHTML = `
            <input type="hidden" name="ctId" value="${ctId}">
            <div class="input-group"><label>Nhân viên thực hiện</label><select name="staffId" required>${staffs.map(s => `<option value="${s.id}">${s.fullName}</option>`).join('')}</select></div>
            <div class="input-group"><label>Ghi chú buổi tập</label><textarea name="note" style="width:100%; height:80px; padding:10px; border-radius:8px; border:1px solid #ddd"></textarea></div>
        `;
        document.getElementById('edit-form').onsubmit = async (e) => {
            e.preventDefault();
            const fd = new FormData(e.target);
            await apiCall('/TreatmentSessions', 'POST', { customerTreatmentId: parseInt(fd.get('ctId')), staffId: parseInt(fd.get('staffId')), note: fd.get('note'), status: 'Done' });
            modal.classList.add('hidden');
            showToast('Đã ghi nhận buổi thực hiện!');
            renderers.customerTreatments();
        };
    },

    appointments: async () => {
        const [apps, customers, services, staffs, beds] = await Promise.all([apiCall('/Appointments'), apiCall('/Customers'), apiCall('/Services'), apiCall('/Staffs'), apiCall('/Beds')]);
        document.getElementById('section-container').innerHTML = `
            <div class="card glass" style="margin-bottom:30px"><h3>Tạo lịch hẹn mới</h3>
                <form id="booking-form"><div class="form-row">
                    <div class="input-group"><label>Khách hàng</label><select id="book-customer" required><option value="">-- Chọn khách --</option>${customers.map(c => `<option value="${c.id}">${c.fullName}</option>`).join('')}</select></div>
                    <div class="input-group"><label>Dịch vụ</label><select id="book-service" required><option value="">-- Chọn dịch vụ --</option>${services.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}</select></div>
                    <div class="input-group"><label>Kỹ thuật viên</label><select id="book-staff"><option value="">-- Tự động gán sau --</option>${staffs.filter(s => s.position === 'Kỹ thuật viên').map(s => `<option value="${s.id}">${s.fullName}</option>`).join('')}</select></div>
                    <div class="input-group"><label>Giường/Phòng</label><select id="book-bed"><option value="">-- Chọn sau --</option>${beds.filter(b => b.status === 'Available').map(b => `<option value="${b.id}">${b.bedName} (${b.room?.roomName} - ${b.room?.roomType?.name})</option>`).join('')}</select></div>
                </div><div class="form-row">
                    <div class="input-group"><label>Ngày giờ</label><input type="datetime-local" id="book-date" required value="${toLocalISOString(new Date(Date.now() + 35*60000))}"></div>
                    <div class="input-group" style="align-self:flex-end"><button type="submit" class="btn-primary">Xác nhận</button></div>
                </div></form></div>
            <table><thead><tr><th>Khách hàng</th><th>Ngày hẹn</th><th>Vị trí</th><th>NV thực hiện</th><th>Trạng thái</th><th>Dịch vụ</th><th style="text-align:right">Thao tác</th></tr></thead>
            <tbody>${await (async () => {
                const orders = await apiCall('/Orders');
                const paidAppIds = orders.map(o => o.appointmentId);
                return apps.map(a => {
                    const appDate = new Date(a.appointmentDate);
                    const now = new Date();
                    const canEdit = (appDate - now) > 30 * 60000;
                    const isPaid = paidAppIds.includes(a.id);
                    const isCompletedOrAssigned = a.status === 'Done' || a.status === 'Assigned';

                    return `<tr><td><strong>${a.customer?.fullName || 'N/A'}</strong></td><td>${appDate.toLocaleString()}</td><td>${a.bed ? `${a.bed.bedName} (${a.bed.room?.roomName})` : '<em style="color:#94a3b8">Chưa gán</em>'}</td><td>${a.staff?.fullName || '<em style="color:#94a3b8">Chưa gán</em>'}</td><td><span class="badge badge-${a.status.toLowerCase()}">${a.status}</span></td><td>${a.appointmentDetails?.map(d => d.service?.name).join(', ') || ''}</td>
                    <td style="text-align:right">
                        ${!isPaid && a.status !== 'Done' ? (canEdit ? `<button onclick="editAppointment(${a.id})" class="btn-edit" title="Chỉnh sửa chi tiết"><i class="fas fa-edit"></i> Sửa chi tiết</button>` : `<button class="btn-edit" style="background:#ccc; cursor:not-allowed" title="Quá hạn chỉnh sửa" onclick="showToast('Chỉ có thể sửa trước giờ hẹn 30 phút','error')"><i class="fas fa-edit"></i> Sửa chi tiết</button>`) : ''}
                        ${a.status === 'Pending' ? `<button onclick="assignStaff(${a.id})" class="btn-edit" style="background:#10B981" title="Gán NV">Gán NV</button>` : ''} 
                        ${a.status === 'Assigned' ? `<button onclick="completeAppointment(${a.id})" class="btn-edit" style="background:#3B82F6" title="Xong">Xong</button>` : ''}
                        ${isCompletedOrAssigned && !isPaid ? `<button onclick="window.showQuickCheckoutModal(${a.id})" class="btn-edit" style="background:#F472B6" title="Thanh toán"><i class="fas fa-credit-card"></i> Thanh toán</button>` : ''}
                        ${isPaid ? `<span class="badge badge-active"><i class="fas fa-check"></i> Đã thanh toán</span>` : `<button class="btn-danger" onclick="deleteItem('/Appointments', ${a.id}, 'Lịch #${a.id}')" title="Hủy"><i class="fas fa-trash"></i></button>`}
                    </td></tr>`;
                }).join('');
            })()}</tbody></table>
        `;
        document.getElementById('booking-form').onsubmit = async (e) => {
            e.preventDefault();
            const customerId = parseInt(document.getElementById('book-customer').value);
            const serviceIds = [parseInt(document.getElementById('book-service').value)];
            const appointmentDateStr = document.getElementById('book-date').value;
            const staffId = document.getElementById('book-staff').value ? parseInt(document.getElementById('book-staff').value) : null;
            const bedId = document.getElementById('book-bed').value ? parseInt(document.getElementById('book-bed').value) : null;

            // Validator Frontend
            const appDate = new Date(appointmentDateStr);
            const now = new Date();
            if (appDate < new Date(now.getTime() + 29 * 60000)) {
                return showToast('Thời gian đặt lịch phải sau hiện tại ít nhất 30 phút.', 'error');
            }

            const sendBooking = async (ignoreConflicts = false) => {
                try {
                    await apiCall('/Appointments/Book', 'POST', { customerId, appointmentDate: appointmentDateStr, serviceIds, staffId, bedId, ignoreConflicts });
                    showToast('Đã đặt lịch thành công!');
                    renderers.appointments();
                } catch (err) {
                    if (err.status === 409) {
                        if (confirm(err.message)) {
                            await sendBooking(true);
                        }
                    } else {
                        // Lỗi khác đã được showToast trong apiCall
                    }
                }
            };
            await sendBooking();
        };
    },

    checkout: async () => {
        const [customers, services, promos, products, orders, roomTypes] = await Promise.all([
            apiCall('/Customers'), 
            apiCall('/Services'), 
            apiCall('/Promotions'), 
            apiCall('/Product'), 
            apiCall('/Orders'),
            apiCall('/RoomTypes')
        ]);
        
        document.getElementById('section-container').innerHTML = `
            <div class="form-row">
                <div class="card glass"><h2>Tiếp nhận & Thanh toán</h2>
                    <div class="input-group"><label>Khách hàng</label>
                        <select id="checkout-customer">
                            <option value="">-- Chọn khách hàng --</option>
                            ${customers.map(c => `<option value="${c.id}">${c.fullName} - ${c.phoneNumber}</option>`).join('')}
                        </select>
                    </div>
                    
                    <div id="checkout-services-group" class="input-group hidden">
                        <label>Chọn dịch vụ sử dụng</label>
                        <div class="checkbox-list" id="checkout-services" style="max-height:150px">
                            ${services.map(s => `
                                <label class="checkbox-item">
                                    <input type="checkbox" value="${s.id}" class="service-checkout-checkbox">
                                    ${s.name} (${s.price.toLocaleString()}đ)
                                </label>
                            `).join('')}
                        </div>
                    </div>

                    <div class="input-group"><label>Sản phẩm mua kèm (Nếu có)</label>
                        <div class="checkbox-list" id="checkout-products" style="max-height:100px">
                            ${products.map(p => `
                                <label class="checkbox-item">
                                    <input type="checkbox" value="${p.id}" class="product-checkbox">
                                    ${p.name} (${p.price.toLocaleString()}đ)
                                </label>
                            `).join('')}
                        </div>
                    </div>

                    <div class="form-row" style="margin-bottom:0">
                        <div class="input-group"><label>Loại phòng</label>
                            <select id="checkout-room-type">
                                <option value="">-- Mặc định (Phòng thường) --</option>
                                ${roomTypes.map(rt => `<option value="${rt.id}">${rt.name} (x${rt.priceMultiplier})</option>`).join('')}
                            </select>
                        </div>
                        <div class="input-group"><label>Khuyến mãi</label>
                            <select id="checkout-promo">
                                <option value="">-- Không áp dụng --</option>
                                ${promos.map(p => `<option value="${p.id}">${p.name} (-${p.discountPercent}%)</option>`).join('')}
                            </select>
                        </div>
                    </div>
                    
                    <div class="input-group"><label>Phương thức thanh toán</label>
                        <select id="checkout-method">
                            <option value="Tiền mặt">Tiền mặt</option>
                            <option value="Chuyển khoản">Chuyển khoản</option>
                            <option value="Thẻ ATM/Visa">Thẻ ATM/Visa</option>
                        </select>
                    </div>
                    <button class="btn-primary" id="btn-pay" style="margin-top:15px">Hoàn tất thanh toán</button>
                </div>
                <div class="card glass"><h2>Lịch sử giao dịch</h2><div style="max-height:500px; overflow-y:auto"><table>
                <thead><tr><th>HĐ</th><th>Khách hàng</th><th>Tổng tiền</th>${state.user?.role === 'Admin' ? '<th>Xóa</th>' : ''}</tr></thead>
                <tbody>${orders.sort((a,b) => b.id - a.id).map(o => `<tr><td>#${o.id}</td><td><strong>${o.customer?.fullName || 'N/A'}</strong><br><small>${new Date(o.orderDate).toLocaleString()}</small></td><td><strong>${o.totalAmount.toLocaleString()}đ</strong></td>
                ${state.user?.role === 'Admin' ? `<td><button class="btn-danger" onclick="deleteItem('/Orders', ${o.id}, 'HĐ #${o.id}')"><i class="fas fa-trash"></i></button></td>` : ''}</tr>`).join('')}</tbody></table></div></div>
            </div>
        `;

        const selectCust = document.getElementById('checkout-customer');
        const serviceGroup = document.getElementById('checkout-services-group');

        selectCust.onchange = () => {
            if (selectCust.value) serviceGroup.classList.remove('hidden');
            else serviceGroup.classList.add('hidden');
        };

        document.getElementById('btn-pay').onclick = async () => {
            const custId = selectCust.value;
            if (!custId) return showToast('Vui lòng chọn khách hàng!', 'error');

            const serviceIds = Array.from(document.querySelectorAll('#checkout-services .service-checkout-checkbox:checked')).map(el => parseInt(el.value));
            const productIds = Array.from(document.querySelectorAll('#checkout-products .product-checkbox:checked')).map(el => parseInt(el.value));
            
            if (serviceIds.length === 0 && productIds.length === 0) {
                return showToast('Vui lòng chọn ít nhất một dịch vụ hoặc sản phẩm!', 'error');
            }

            const promotionId = document.getElementById('checkout-promo').value ? parseInt(document.getElementById('checkout-promo').value) : null;
            const paymentMethod = document.getElementById('checkout-method').value;
            const roomTypeId = document.getElementById('checkout-room-type').value ? parseInt(document.getElementById('checkout-room-type').value) : null;
            
            try {
                await apiCall('/Orders/Checkout', 'POST', { 
                    customerId: parseInt(custId), 
                    serviceIds, 
                    productIds, 
                    promotionId, 
                    paymentMethod,
                    roomTypeId
                });
                showToast('Thanh toán thành công!');
                renderers.checkout();
            } catch (err) {}
        };
    },

    audit: async () => {
        try {
            const logs = await apiCall('/AuditLogs');
            document.getElementById('section-container').innerHTML = `<table><thead><tr><th>Thời gian</th><th>User</th><th>Hành động</th><th>Chi tiết</th></tr></thead>
            <tbody>${logs.map(l => `<tr><td>${new Date(l.timestamp).toLocaleString()}</td><td>${l.userId}</td><td>${l.action} ${l.tableName}</td><td><details><pre>${l.newValues || l.oldValues || ''}</pre></details></td></tr>`).join('')}</tbody></table>`;
        } catch(e) { document.getElementById('section-container').innerHTML = '<p>Không có quyền.</p>'; }
    },

    reviews: async () => {
        const revs = await apiCall('/Reviews');
        document.getElementById('section-container').innerHTML = `
            <div class="header-row"><h3>Phản hồi từ khách hàng</h3></div>
            <table><thead><tr><th>Khách hàng</th><th>Dịch vụ</th><th>Lịch hẹn</th><th>Đánh giá</th><th>Nội dung</th><th>Ngày</th><th style="text-align:right">Thao tác</th></tr></thead>
            <tbody>${revs.map(r => `
                <tr>
                    <td><strong>${r.customer?.fullName || 'Khách vãng lai'}</strong></td>
                    <td>${r.service?.name || '<em style="color:#94a3b8">Toàn bộ trải nghiệm</em>'}</td>
                    <td>
                        ${r.appointment ? `
                            <div style="font-size:0.8rem">
                                <strong>#${r.appointmentId}</strong><br>
                                ${new Date(r.appointment.appointmentDate).toLocaleString()}<br>
                                <small>${r.appointment.appointmentDetails?.map(d => d.service?.name).join(', ') || ''}</small>
                            </div>
                        ` : '<em style="color:#94a3b8">N/A</em>'}
                    </td>
                    <td style="color:#d4af37">${'⭐'.repeat(r.rating)}</td>
                    <td><div style="max-width:250px; font-size:0.9rem; line-height:1.4">${r.comment}</div></td>
                    <td>${new Date(r.createdAt || Date.now()).toLocaleDateString('vi-VN')}</td>
                    <td style="text-align:right">
                        <button class="btn-danger" onclick="deleteItem('/Reviews', ${r.id}, 'Đánh giá của ${r.customer?.fullName || 'Khách'}')"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>`).join('')}</tbody></table>
        `;
    },

    roomTypes: async () => {
        const data = await apiCall('/RoomTypes');
        const isAdmin = state.user?.role === 'Admin';
            document.getElementById('section-container').innerHTML = `
            <div class="header-row"><h3>Danh mục loại phòng</h3> ${isAdmin ? '<button class="btn-primary" onclick="addItem(\'roomType\')">+ Thêm loại phòng</button>' : ''}</div>
            <table><thead><tr><th>Loại phòng</th><th>Hệ số giá</th><th>Mô tả</th>${isAdmin ? '<th style="text-align:right">Thao tác</th>' : ''}</tr></thead>
            <tbody>${data.map(i => `<tr><td><strong>${i.name}</strong></td><td><span class="badge badge-assigned">x${i.priceMultiplier}</span></td><td>${i.description || ''}</td>
            ${isAdmin ? `<td style="text-align:right"><button class="btn-edit" onclick="openEditModal('roomType', ${i.id})">Sửa</button> <button class="btn-danger" onclick="deleteItem('/RoomTypes', ${i.id}, '${i.name}')">Xóa</button></td>` : ''}</tr>`).join('')}</tbody></table>`;
    },

    rooms: async () => {
        const data = await apiCall('/Rooms');
        const isAdmin = state.user?.role === 'Admin';
        document.getElementById('section-container').innerHTML = `
            <div class="header-row"><h3>Quản lý Phòng</h3> ${isAdmin ? '<button class="btn-primary" onclick="addItem(\'room\')">+ Thêm phòng</button>' : ''}</div>
            <table><thead><tr><th>Tên phòng</th><th>Loại phòng</th><th>Trạng thái</th>${isAdmin ? '<th style="text-align:right">Thao tác</th>' : ''}</tr></thead>
            <tbody>${data.map(i => `<tr><td><strong>${i.roomName}</strong></td><td>${i.roomType?.name || 'N/A'}</td><td><span class="badge badge-${i.status.toLowerCase()}">${i.status}</span></td>
            ${isAdmin ? `<td style="text-align:right"><button class="btn-edit" onclick="openEditModal('room', ${i.id})">Sửa</button> <button class="btn-danger" onclick="deleteItem('/Rooms', ${i.id}, '${i.roomName}')">Xóa</button></td>` : ''}</tr>`).join('')}</tbody></table>`;
    },

    beds: async () => {
        const data = await apiCall('/Beds');
        const isAdmin = state.user?.role === 'Admin';
        document.getElementById('section-container').innerHTML = `
            <div class="header-row"><h3>Quản lý Giường</h3> ${isAdmin ? '<button class="btn-primary" onclick="addItem(\'bed\')">+ Thêm giường</button>' : ''}</div>
            <table><thead><tr><th>Tên giường</th><th>Phòng</th><th>Loại phòng</th><th>Trạng thái</th>${isAdmin ? '<th style="text-align:right">Thao tác</th>' : ''}</tr></thead>
            <tbody>${data.map(i => `<tr><td><strong>${i.bedName}</strong></td><td>${i.room?.roomName || 'N/A'}</td><td>${i.room?.roomType?.name || 'N/A'}</td><td><span class="badge badge-${i.status.toLowerCase()}">${i.status}</span></td>
            ${isAdmin ? `<td style="text-align:right"><button class="btn-edit" onclick="openEditModal('bed', ${i.id})">Sửa</button> <button class="btn-danger" onclick="deleteItem('/Beds', ${i.id}, '${i.bedName}')">Xóa</button></td>` : ''}</tr>`).join('')}</tbody></table>`;
    },

    notifications: async () => {
        const list = await apiCall('/Notifications');
        document.getElementById('section-container').innerHTML = `
            <div class="table-controls">
                <h3>Trung tâm thông báo</h3>
                <button class="btn-edit" style="width:auto" onclick="markAllNotificationsRead()">Đánh dấu tất cả đã đọc</button>
            </div>
            <div class="notification-list" style="display:flex; flex-direction:column; gap:15px; margin-top:20px">
                ${list.length === 0 ? '<p style="text-align:center; color:var(--text-gray); padding:40px">Không có thông báo nào.</p>' : list.map(n => `
                    <div class="card glass" onclick="viewNotificationDetail('${n.targetType}', '${n.targetId}', ${n.id})" 
                         style="opacity: ${n.isRead ? '0.6' : '1'}; border-left: 4px solid ${n.isRead ? '#ddd' : 'var(--primary)'}; cursor:pointer; transition: transform 0.2s"
                         onmouseover="this.style.transform='translateX(5px)'" onmouseout="this.style.transform='translateX(0)'">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px">
                            <strong style="color:var(--primary)">${n.title}</strong>
                            <small style="color:var(--text-gray)">${new Date(n.createdDate).toLocaleString()}</small>
                        </div>
                        <p style="font-size:0.95rem">${n.message}</p>
                        ${n.targetType && n.targetType !== 'null' ? `<div style="margin-top:10px; font-size:11px; color:var(--primary); font-weight:bold"><i class="fas fa-external-link-alt"></i> Xem chi tiết ${n.targetType === 'Appointment' ? 'Lịch hẹn' : 'Đơn hàng'}</div>` : ''}
                    </div>
                `).join('')}
            </div>
        `;
        // Mark all as read when entering this section
        if (list.some(n => !n.isRead)) {
            await markAllNotificationsRead(false);
        }
    }
};

// --- Helpers ---
window.addItem = (type) => openCRUDModal(type);

window.assignStaff = async (id) => {
    const [app, staffs, beds] = await Promise.all([
        apiCall(`/Appointments/${id}`), 
        apiCall('/Staffs'), 
        apiCall(`/Appointments/${id}/AvailableBeds`)
    ]);
    const modal = document.getElementById('edit-modal');
    const fields = document.getElementById('modal-fields');
    const title = document.getElementById('modal-title');
    const form = document.getElementById('edit-form');

    title.textContent = `Phân công nhân viên & Giường: #${id}`;
    modal.classList.remove('hidden');

    fields.innerHTML = `
        <div class="input-group">
            <label>Chọn nhân viên (${app.customer?.fullName})</label>
            <select name="staffId" id="assign-staff" required>
                <option value="">-- Chọn nhân viên --</option>
                ${staffs.map(s => `<option value="${s.id}" ${app.staffId == s.id ? 'selected' : ''}>${s.fullName}</option>`).join('')}
            </select>
        </div>
        <div class="input-group">
            <label>Chọn Giường trống (Dựa trên khung giờ: ${new Date(app.appointmentDate).toLocaleTimeString()})</label>
            <select name="bedId" id="assign-bed" required>
                <option value="">-- Chọn giường --</option>
                ${beds.length === 0 ? '<option value="" disabled>Không còn giường trống khung giờ này</option>' : beds.map(b => `
                    <option value="${b.id}" ${app.bedId == b.id ? 'selected' : ''}>
                        ${b.bedName} - ${b.room?.roomName} (${b.room?.roomType?.name})
                    </option>
                `).join('')}
            </select>
        </div>
    `;

    form.onsubmit = async (e) => {
        e.preventDefault();
        const staffId = document.getElementById('assign-staff').value;
        const bedId = document.getElementById('assign-bed').value;

        try {
            await apiCall(`/Appointments/${id}/Assign`, 'PUT', { 
                staffId: parseInt(staffId), 
                bedId: parseInt(bedId) 
            });
            modal.classList.add('hidden');
            showToast('Phân công thành công!');
            renderers.appointments();
        } catch (err) {}
    };
};

window.completeAppointment = async (id) => { await apiCall(`/Appointments/${id}/Complete`, 'PUT'); renderers.appointments(); };

window.editAppointment = async (id) => {
    const [app, customers, services, staffs, beds] = await Promise.all([
        apiCall(`/Appointments/${id}`),
        apiCall('/Customers'),
        apiCall('/Services'),
        apiCall('/Staffs'),
        apiCall(`/Appointments/${id}/AvailableBeds`)
    ]);

    const modal = document.getElementById('edit-modal');
    const fields = document.getElementById('modal-fields');
    const title = document.getElementById('modal-title');
    const form = document.getElementById('edit-form');

    title.textContent = "Chỉnh sửa chi tiết lịch hẹn";
    modal.classList.remove('hidden');

    const currentServiceIds = app.appointmentDetails.map(d => d.serviceId);

    fields.innerHTML = `
        <div class="input-group"><label>Khách hàng</label>
            <select name="customerId" disabled>${customers.map(c => `<option value="${c.id}" ${c.id === app.customerId ? 'selected' : ''}>${c.fullName}</option>`).join('')}</select>
        </div>
        <div class="input-group"><label>Dịch vụ (Chọn nhiều)</label>
            <div class="checkbox-list">
                ${services.map(s => `
                    <label class="checkbox-item">
                        <input type="checkbox" name="serviceIds" value="${s.id}" ${currentServiceIds.includes(s.id) ? 'checked' : ''}>
                        ${s.name}
                    </label>
                `).join('')}
            </div>
        </div>
        <div class="input-group"><label>Ngày giờ</label>
            <input type="datetime-local" name="appointmentDate" value="${toLocalISOString(new Date(app.appointmentDate))}" required>
        </div>
        <div class="input-group"><label>Kỹ thuật viên</label>
            <select name="staffId">
                <option value="">-- Tự động gán --</option>
                ${staffs.filter(s => s.position === 'Kỹ thuật viên').map(s => `<option value="${s.id}" ${s.id === app.staffId ? 'selected' : ''}>${s.fullName}</option>`).join('')}
            </select>
        </div>
        <div class="input-group"><label>Giường/Phòng (Trống trong khung giờ này)</label>
            <select name="bedId">
                <option value="">-- Chọn sau --</option>
                ${beds.map(b => `<option value="${b.id}" ${b.id === app.bedId ? 'selected' : ''}>${b.bedName} (${b.room?.roomName} - ${b.room?.roomType?.name})</option>`).join('')}
            </select>
        </div>
    `;

    form.onsubmit = async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const body = {
            customerId: app.customerId,
            appointmentDate: fd.get('appointmentDate'),
            serviceIds: fd.getAll('serviceIds').map(id => parseInt(id)),
            staffId: fd.get('staffId') ? parseInt(fd.get('staffId')) : null,
            bedId: fd.get('bedId') ? parseInt(fd.get('bedId')) : null
        };

        try {
            await apiCall(`/Appointments/${id}`, 'PUT', body);
            modal.classList.add('hidden');
            showToast('Cập nhật lịch hẹn thành công!');
            renderers.appointments();
        } catch (err) {}
    };
};

window.showQuickCheckoutModal = async (id) => {
    const [app, promos] = await Promise.all([apiCall(`/Appointments/${id}`), apiCall('/Promotions')]);
    const modal = document.getElementById('edit-modal');
    const fields = document.getElementById('modal-fields');
    const title = document.getElementById('modal-title');
    const form = document.getElementById('edit-form');

    title.textContent = `Thanh toán: #${app.id} - ${app.customer?.fullName}`;
    modal.classList.remove('hidden');

    const totalBeforePromo = app.appointmentDetails.reduce((sum, d) => sum + d.price * d.quantity, 0);
    const multiplier = app.bed?.room?.roomType?.priceMultiplier || 1.0;
    const roomName = app.bed?.room?.roomType?.name || "Thường";
    const rank = app.customer?.rank || "Standard";
    let rankDiscountRate = 0;
    if (rank === "Silver") rankDiscountRate = 0.05;
    else if (rank === "Gold") rankDiscountRate = 0.10;
    else if (rank === "Platinum") rankDiscountRate = 0.15;

    const baseTotal = totalBeforePromo * multiplier;
    const rankDiscountAmount = baseTotal * rankDiscountRate;

    fields.innerHTML = `
        <div class="billing-summary" style="padding: 15px; background: rgba(244, 114, 182, 0.05); border-radius: 12px; margin-bottom: 20px;">
            <h4 style="margin-bottom: 10px; color: var(--primary);">Tóm tắt thanh toán:</h4>
            ${app.appointmentDetails.map(d => `
                <div style="display: flex; justify-content: space-between; font-size: 0.85rem; margin-bottom: 5px;">
                    <span>${d.service?.name} ${multiplier !== 1 ? `(<small>x${multiplier}</small>)` : ''}</span>
                    <strong>${(d.price * multiplier).toLocaleString()}đ</strong>
                </div>
            `).join('')}
            <div style="border-top: 1px dashed #ddd; margin-top: 10px; padding-top: 10px; display: flex; justify-content: space-between; font-size: 0.9rem;">
                <span>Tạm tính:</span>
                <span>${baseTotal.toLocaleString()}đ</span>
            </div>
            ${rankDiscountAmount > 0 ? `
            <div style="display: flex; justify-content: space-between; font-size: 0.9rem; color: #10B981;">
                <span>Ưu đãi hạng ${rank}:</span>
                <span>-${rankDiscountAmount.toLocaleString()}đ</span>
            </div>
            ` : ''}
            <div style="display: flex; justify-content: space-between; font-weight: 700; font-size: 1.1rem; margin-top: 5px; color: var(--primary);">
                <span>Tổng cộng:</span>
                <span id="label-total">${(baseTotal - rankDiscountAmount).toLocaleString()}đ</span>
            </div>
        </div>
        <div class="input-group">
            <label>Áp dụng mã giảm giá (Cộng dồn)</label>
            <select id="quick-promo">
                <option value="">-- Không sử dụng --</option>
                ${promos.map(p => `<option value="${p.id}">${p.name} (-${p.discountPercent}%)</option>`).join('')}
            </select>
        </div>
        <div class="input-group">
            <label>Phương thức thanh toán</label>
            <select id="quick-method">
                <option value="Tiền mặt">Tiền mặt</option>
                <option value="Chuyển khoản">Chuyển khoản</option>
                <option value="Thẻ ATM/Visa">Thẻ ATM/Visa</option>
            </select>
        </div>
    `;
    
    document.getElementById('quick-promo').onchange = (e) => {
        const promo = promos.find(p => p.id == e.target.value);
        const finalBase = baseTotal - rankDiscountAmount;
        if (promo) {
            const discount = finalBase * (promo.discountPercent / 100);
            document.getElementById('label-total').textContent = `${(finalBase - discount).toLocaleString()}đ`;
        } else {
            document.getElementById('label-total').textContent = `${finalBase.toLocaleString()}đ`;
        }
    };

    form.onsubmit = async (e) => {
        e.preventDefault();
        const promotionId = document.getElementById('quick-promo').value ? parseInt(document.getElementById('quick-promo').value) : null;
        const paymentMethod = document.getElementById('quick-method').value;
        
        // Auto-complete if not Done
        if (app.status !== 'Done') {
            try {
                await apiCall(`/Appointments/${app.id}/Complete`, 'PUT');
            } catch (err) { return; }
        }

        try {
            await apiCall('/Orders/Checkout', 'POST', { appointmentId: app.id, promotionId, productIds: [], paymentMethod });
            modal.classList.add('hidden');
            showToast('Thanh toán thành công!');
            renderers.appointments();
        } catch (err) {}
    };
};

// --- Init ---
async function initApp() {
    if (!state.token) return handleLogout();
    state.user = parseJwt(state.token);
    if (!state.user) {
        handleLogout();
        return;
    }
    document.getElementById('auth-overlay').classList.add('hidden');
    document.getElementById('main-sidebar').classList.remove('hidden');
    document.getElementById('display-name').textContent = state.user.username;
    document.getElementById('display-role').textContent = state.user.role;
    document.getElementById('user-avatar').textContent = state.user.username.substring(0, 2).toUpperCase();

    document.querySelectorAll('.nav-item').forEach(item => {
        const section = item.getAttribute('data-section');
        if (state.user.role === 'Staff' && section === 'audit') {
            item.style.display = 'none';
        }

        item.onclick = (e) => {
            e.preventDefault();
            document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            state.activeSection = item.getAttribute('data-section');
            document.getElementById('section-title').textContent = item.innerText.trim();
            renderers[state.activeSection]();
        };
    });
    renderers.dashboard();
}

const authForm = document.getElementById('auth-form');
if (authForm) {
    authForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const isLogin = document.getElementById('tab-login').classList.contains('active');
        if (isLogin) handleLogin(e); else handleRegister(e);
    });
}

document.getElementById('tab-login')?.addEventListener('click', () => switchAuthTab('login'));
document.getElementById('tab-register')?.addEventListener('click', () => switchAuthTab('register'));
document.getElementById('logout-btn')?.addEventListener('click', handleLogout);
document.getElementById('close-modal')?.addEventListener('click', () => document.getElementById('edit-modal').classList.add('hidden'));

// --- Notifications Logic ---
async function pollNotifications() {
    if (!state.token) return;
    try {
        const list = await apiCall('/Notifications');
        const unreadCount = list.filter(n => !n.isRead).length;
        const badge = document.getElementById('notif-badge');
        if (unreadCount > 0) {
            badge.textContent = unreadCount;
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }
    } catch (e) {}
}

window.markAllNotificationsRead = async (refresh = true) => {
    try {
        await apiCall('/Notifications/read-all', 'POST');
        await pollNotifications();
        if (refresh && state.activeSection === 'notifications') renderers.notifications();
    } catch (e) {}
};

document.getElementById('btn-notifications')?.addEventListener('click', () => {
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    state.activeSection = 'notifications';
    document.getElementById('section-title').textContent = 'Thông báo';
    renderers.notifications();
});

window.viewNotificationDetail = async (type, id, notifId) => {
    // Mark as read first
    try { await apiCall(`/Notifications/${notifId}/read`, 'POST'); } catch(e) {}
    await pollNotifications();

    // Handle string "null" or missing values
    if (!type || type === 'null' || type === 'undefined' || !id || id === 'null') {
        state.activeSection = 'notifications';
        document.getElementById('section-title').textContent = 'Thông báo';
        await renderers.notifications();
        return;
    }

    if (type === 'Appointment') {
        state.activeSection = 'appointments';
        document.getElementById('section-title').textContent = 'Lịch hẹn';
        document.querySelectorAll('.nav-item').forEach(i => {
            if(i.getAttribute('data-section') === 'appointments') i.classList.add('active');
            else i.classList.remove('active');
        });
        await renderers.appointments();
        openEditModal('appointment', id);
    } else if (type === 'Order') {
        state.activeSection = 'orders';
        document.getElementById('section-title').textContent = 'Đơn hàng';
        document.querySelectorAll('.nav-item').forEach(i => {
            if(i.getAttribute('data-section') === 'orders') i.classList.add('active');
            else i.classList.remove('active');
        });
        await renderers.orders();
        openEditModal('order', id);
    } else if (type === 'Promotion') {
        state.activeSection = 'promotions';
        document.getElementById('section-title').textContent = 'Khuyến mãi';
        document.querySelectorAll('.nav-item').forEach(i => {
            if(i.getAttribute('data-section') === 'promotions') i.classList.add('active');
            else i.classList.remove('active');
        });
        await renderers.promotions();
        openEditModal('promotion', id);
    } else {
        // Just show notifications list
        state.activeSection = 'notifications';
        renderers.notifications();
    }
};

setInterval(pollNotifications, 30000); // Poll every 30s

document.title = "Ctus Spa - Quản trị";
initApp();
pollNotifications();
