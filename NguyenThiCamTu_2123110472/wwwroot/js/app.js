/**
 * Ctus Spa CRM - Frontend Logic
 * Updated: 02/04/2026 - Final Full Version
 */

// Cấu hình URL Backend: Thay đổi URL Render của bạn tại đây khi deploy
const RENDER_EXTERNAL_URL = 'https://nguyenthicantu-2123110472.onrender.com'; 

const API_BASE = (window.location.hostname.includes('vercel.app'))
    ? RENDER_EXTERNAL_URL + '/api'
    : window.location.origin + '/api';

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

// --- API Helper ---
async function apiCall(endpoint, method = 'GET', body = null) {
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
        if (err.message !== 'Hết phiên làm việc.') showToast(err.message, 'error');
        throw err;
    }
}

// --- Auth ---
async function handleLogin(e) {
    e.preventDefault();
    try {
        const result = await apiCall('/Auth/Login', 'POST', { 
            username: e.target.username.value, 
            password: e.target.password.value 
        });
        state.token = result.token;
        localStorage.setItem('crm_token', state.token);
        initApp();
    } catch (err) {}
}

async function handleRegister(e) {
    e.preventDefault();
    try {
        await apiCall('/Auth/Register', 'POST', { 
            username: e.target.username.value, 
            password: e.target.password.value,
            role: e.target.role.value
        });
        showToast('Đăng ký thành công! Vui lòng đăng nhập.');
        switchAuthTab('login');
    } catch (err) {}
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
    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.style.background = type === 'success' ? '#10B981' : '#EF4444';
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 3000);
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
    
    title.textContent = (isEdit ? 'Chỉnh sửa ' : 'Thêm mới ') + (type === 'customer' ? 'Khách hàng' : type === 'staff' ? 'Nhân viên' : type === 'service' ? 'Dịch vụ' : type === 'product' ? 'Sản phẩm' : 'Khuyến mãi');
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
            <div class="input-group"><label>Thời gian (phút)</label><input type="number" name="duration" value="${data.durationMinutes}"></div>
        `;
    } else if (type === 'product') {
        html += `
            <div class="input-group"><label>Tên sản phẩm</label><input type="text" name="name" value="${data.name}"></div>
            <div class="input-group"><label>Giá (VNĐ)</label><input type="number" name="price" value="${data.price}"></div>
            <div class="input-group"><label>Tồn kho</label><input type="number" name="stock" value="${data.stockQuantity}"></div>
        `;
    } else if (type === 'promotion') {
        html += `
            <div class="input-group"><label>Tên CTKM</label><input type="text" name="name" value="${data.name}"></div>
            <div class="input-group"><label>Giảm (%)</label><input type="number" name="pct" value="${data.discountPercent}"></div>
        `;
    } else if (type === 'treatment') {
        html += `
            <div class="input-group"><label>Tên liệu trình</label><input type="text" name="name" value="${data.name}" required></div>
            <div class="input-group"><label>Tổng số buổi</label><input type="number" name="totalSessions" value="${data.totalSessions}" required></div>
            <div class="input-group"><label>Giá trọn gói (VNĐ)</label><input type="number" name="price" value="${data.price}" required></div>
            <div class="input-group"><label>Thời gian/buổi (phút)</label><input type="number" name="duration" value="${data.durationPerSession || 60}" required></div>
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
        let body = isEdit ? { id: data.id } : {};
        
        if (type === 'customer') body = {...body, fullName: fd.get('fullName'), phoneNumber: fd.get('phoneNumber'), email: fd.get('email')};
        if (type === 'staff') body = {...body, fullName: fd.get('fullName'), phoneNumber: fd.get('phoneNumber'), position: fd.get('position'), email: fd.get('email')};
        if (type === 'service') body = {...body, name: fd.get('name'), price: parseFloat(fd.get('price')), durationMinutes: parseInt(fd.get('duration'))};
        if (type === 'product') body = {...body, name: fd.get('name'), price: parseFloat(fd.get('price')), stockQuantity: parseInt(fd.get('stock'))};
        if (type === 'promotion') body = {...body, name: fd.get('name'), discountPercent: parseFloat(fd.get('pct')), startDate: data.startDate || new Date(), endDate: data.endDate || new Date(Date.now() + 7*24*3600*1000)};
        if (type === 'treatment') body = {...body, name: fd.get('name'), totalSessions: parseInt(fd.get('totalSessions')), price: parseFloat(fd.get('price')), durationPerSession: parseInt(fd.get('duration'))};
        if (type === 'customerTreatment') body = {...body, customerId: parseInt(fd.get('customerId')), treatmentId: parseInt(fd.get('treatmentId')), status: fd.get('status')};
        if (type === 'roomType') body = {...body, name: fd.get('name'), description: fd.get('desc'), priceMultiplier: parseFloat(fd.get('multiplier'))};
        if (type === 'room') body = {...body, roomName: fd.get('roomName'), roomTypeId: parseInt(fd.get('roomTypeId')), status: fd.get('status')};
        if (type === 'bed') body = {...body, bedName: fd.get('bedName'), roomId: parseInt(fd.get('roomId')), status: fd.get('status')};

        if (!validateData(e.target, body)) return;
        
        const ep = type === 'product' ? '/Product' : (['treatment', 'customerTreatment', 'roomType', 'room', 'bed'].includes(type) ? `/${type.charAt(0).toUpperCase() + type.slice(1) + 's'}` : `/${type.charAt(0).toUpperCase() + type.slice(1) + 's'}`);
        try {
            await apiCall(isEdit ? `${ep}/${id}` : ep, isEdit ? 'PUT' : 'POST', body);
            modal.classList.add('hidden');
            showToast(isEdit ? 'Đã cập nhật!' : 'Đã thêm thành công!');
            renderers[state.activeSection]();
        } catch (err) {}
    };
};

// --- Renderers ---
const renderers = {
    dashboard: async () => {
        const [c, a, o] = await Promise.all([apiCall('/Customers'), apiCall('/Appointments'), apiCall('/Orders')]);
        document.getElementById('section-container').innerHTML = `
            <div class="card-grid">
                <div class="card glass"><h3><i class="fas fa-users"></i> Khách hàng</h3><div class="stat-value">${c.length}</div></div>
                <div class="card glass"><h3><i class="fas fa-calendar-alt"></i> Lịch hẹn</h3><div class="stat-value">${a.filter(x => x.status !== 'Done').length}</div></div>
                <div class="card glass"><h3><i class="fas fa-wallet"></i> Doanh thu</h3><div class="stat-value">${o.reduce((s, x) => s + x.totalAmount, 0).toLocaleString()}đ</div></div>
            </div>
        `;
    },

    commonList: async (type, title, endpoint, cols, mapper) => {
        const list = await apiCall(endpoint);
        const isAdmin = state.user?.role === 'Admin';
        const isStaff = state.user?.role === 'Staff';
        
        // Quyết định ai được quyền Thêm/Sửa/Xóa dựa trên yêu cầu:
        // "nhân viên không được thêm nhân viên, chỉ admin được xóa hóa đơn"
        const canManage = isAdmin || (isStaff && type !== 'staff');
        
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

    customers: () => renderers.commonList('customer', 'Khách hàng', '/Customers', ['ID', 'Họ tên', 'SĐT', 'Email'], i => `<td>#${i.id}</td><td><strong>${i.fullName}</strong></td><td>${i.phoneNumber}</td><td>${i.email || ''}</td>`),
    
    staffs: () => renderers.commonList('staff', 'Nhân viên', '/Staffs', ['ID', 'Họ tên', 'SĐT', 'Vị trí', 'Email'], i => `<td>#${i.id}</td><td><strong>${i.fullName}</strong></td><td>${i.phoneNumber}</td><td>${i.position || ''}</td><td>${i.email || ''}</td>`),
    
    services: () => renderers.commonList('service', 'Dịch vụ', '/Services', ['ID', 'Tên dịch vụ', 'Giá', 'Thời gian'], i => `<td>#${i.id}</td><td><strong>${i.name}</strong></td><td>${i.price.toLocaleString()}đ</td><td>${i.durationMinutes} phút</td>`),
    
    products: () => renderers.commonList('product', 'Sản phẩm', '/Product', ['ID', 'Tên sản phẩm', 'Giá', 'Tồn kho'], i => `<td>#${i.id}</td><td><strong>${i.name}</strong></td><td>${i.price.toLocaleString()}đ</td><td>${i.stockQuantity}</td>`),
    
    promotions: () => renderers.commonList('promotion', 'Khuyến mãi', '/Promotions', ['ID', 'Tên CTKM', 'Giảm %', 'Hạn dùng'], i => `<td>#${i.id}</td><td><strong>${i.name}</strong></td><td>${i.discountPercent}%</td><td>${new Date(i.endDate).toLocaleDateString()}</td>`),

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
                    <div class="input-group"><label>Kỹ thuật viên</label><select id="book-staff"><option value="">-- Tự động gán sau --</option>${staffs.map(s => `<option value="${s.id}">${s.fullName}</option>`).join('')}</select></div>
                    <div class="input-group"><label>Giường/Phòng</label><select id="book-bed"><option value="">-- Chọn sau --</option>${beds.filter(b => b.status === 'Available').map(b => `<option value="${b.id}">${b.bedName} (${b.room?.roomName} - ${b.room?.roomType?.name})</option>`).join('')}</select></div>
                </div><div class="form-row">
                    <div class="input-group"><label>Ngày giờ</label><input type="datetime-local" id="book-date" required value="${new Date(Date.now() + 35*60000).toISOString().slice(0, 16)}"></div>
                    <div class="input-group" style="align-self:flex-end"><button type="submit" class="btn-primary">Xác nhận</button></div>
                </div></form></div>
            <table><thead><tr><th>Khách hàng</th><th>Ngày hẹn</th><th>Vị trí</th><th>NV thực hiện</th><th>Trạng thái</th><th>Dịch vụ</th><th style="text-align:right">Thao tác</th></tr></thead>
            <tbody>${apps.map(a => `<tr><td><strong>${a.customer?.fullName || 'N/A'}</strong></td><td>${new Date(a.appointmentDate).toLocaleString()}</td><td>${a.bed ? `${a.bed.bedName} (${a.bed.room?.roomName})` : '<em style="color:#94a3b8">Chưa gán</em>'}</td><td>${a.staff?.fullName || '<em style="color:#94a3b8">Chưa gán</em>'}</td><td><span class="badge badge-${a.status.toLowerCase()}">${a.status}</span></td><td>${a.appointmentDetails?.map(d => d.service?.name).join(', ') || ''}</td>
            <td style="text-align:right">${a.status === 'Pending' ? `<button onclick="assignStaff(${a.id})" class="btn-edit" style="background:#10B981">Gán NV</button>` : ''} ${a.status === 'Assigned' ? `<button onclick="completeAppointment(${a.id})" class="btn-edit" style="background:#3B82F6">Xong</button>` : ''}
            <button class="btn-danger" onclick="deleteItem('/Appointments', ${a.id}, 'Lịch #${a.id}')">Hủy</button></td></tr>`).join('')}</tbody></table>
        `;
        document.getElementById('booking-form').onsubmit = async (e) => {
            e.preventDefault();
            const customerId = parseInt(document.getElementById('book-customer').value);
            const serviceIds = [parseInt(document.getElementById('book-service').value)];
            const appointmentDate = document.getElementById('book-date').value;
            const staffId = document.getElementById('book-staff').value ? parseInt(document.getElementById('book-staff').value) : null;
            const bedId = document.getElementById('book-bed').value ? parseInt(document.getElementById('book-bed').value) : null;

            const sendBooking = async (ignoreConflicts = false) => {
                try {
                    await apiCall('/Appointments/Book', 'POST', { customerId, appointmentDate, serviceIds, staffId, bedId, ignoreConflicts });
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
        const [apps, promos, products, orders] = await Promise.all([apiCall('/Appointments'), apiCall('/Promotions'), apiCall('/Product'), apiCall('/Orders')]);
        document.getElementById('section-container').innerHTML = `
            <div class="form-row">
                <div class="card glass"><h2>Thanh toán</h2>
                    <div class="input-group"><label>Lịch hẹn đã xong</label><select id="checkout-app"><option value="">-- Chọn khách --</option>${apps.filter(a => a.status === 'Done').map(a => `<option value="${a.id}">${a.customer?.fullName}</option>`).join('')}</select></div>
                    <div class="input-group"><label>Sản phẩm</label><select id="checkout-products" multiple style="height:60px">${products.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}</select></div>
                    <div class="input-group"><label>Khuyến mãi</label><select id="checkout-promo"><option value="">Không</option>${promos.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}</select></div>
                    <button class="btn-primary" id="btn-pay" style="margin-top:15px">Thanh toán</button>
                </div>
                <div class="card glass"><h2>Lịch sử</h2><div style="max-height:300px; overflow-y:auto"><table>
                <thead><tr><th>ID</th><th>Ngày</th><th>Tổng</th>${state.user?.role === 'Admin' ? '<th>Xóa</th>' : ''}</tr></thead>
                <tbody>${orders.map(o => `<tr><td>#${o.id}</td><td>${new Date(o.orderDate).toLocaleDateString()}</td><td>${o.totalAmount.toLocaleString()}đ</td>
                ${state.user?.role === 'Admin' ? `<td><button class="btn-danger" onclick="deleteItem('/Orders', ${o.id}, 'HĐ #${o.id}')">Xóa</button></td>` : ''}</tr>`).join('')}</tbody></table></div></div>
            </div>
        `;
        document.getElementById('btn-pay').onclick = async () => {
            const appId = document.getElementById('checkout-app').value;
            if (!appId) return showToast('Chọn lịch!', 'error');
            await apiCall('/Orders/Checkout', 'POST', { appointmentId: parseInt(appId), productIds: Array.from(document.getElementById('checkout-products').selectedOptions).map(o => parseInt(o.value)), promotionId: document.getElementById('checkout-promo').value ? parseInt(document.getElementById('checkout-promo').value) : null });
            showToast('Thành công!'); renderers.checkout();
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
        document.getElementById('section-container').innerHTML = `<table><thead><tr><th>Khách</th><th>Dịch vụ</th><th>Rating</th><th>Bình luận</th></tr></thead>
        <tbody>${revs.map(r => `<tr><td>${r.customerId}</td><td>${r.serviceId}</td><td>${'⭐'.repeat(r.rating)}</td><td>${r.comment}</td></tr>`).join('')}</tbody></table>`;
    },

    roomTypes: async () => {
        const data = await apiCall('/RoomTypes');
        document.getElementById('section-container').innerHTML = `
            <div class="header-row"><h3>Danh mục loại phòng</h3> <button class="btn-primary" onclick="addItem('roomType')">+ Thêm loại phòng</button></div>
            <table><thead><tr><th>Loại phòng</th><th>Hệ số giá</th><th>Mô tả</th><th style="text-align:right">Thao tác</th></tr></thead>
            <tbody>${data.map(i => `<tr><td><strong>${i.name}</strong></td><td><span class="badge badge-assigned">x${i.priceMultiplier}</span></td><td>${i.description || ''}</td>
            <td style="text-align:right"><button class="btn-edit" onclick="openEditModal('roomType', ${i.id})">Sửa</button> <button class="btn-danger" onclick="deleteItem('/RoomTypes', ${i.id}, '${i.name}')">Xóa</button></td></tr>`).join('')}</tbody></table>`;
    },

    rooms: async () => {
        const data = await apiCall('/Rooms');
        document.getElementById('section-container').innerHTML = `
            <div class="header-row"><h3>Quản lý Phòng</h3> <button class="btn-primary" onclick="addItem('room')">+ Thêm phòng</button></div>
            <table><thead><tr><th>Tên phòng</th><th>Loại phòng</th><th>Trạng thái</th><th style="text-align:right">Thao tác</th></tr></thead>
            <tbody>${data.map(i => `<tr><td><strong>${i.roomName}</strong></td><td>${i.roomType?.name || 'N/A'}</td><td><span class="badge badge-${i.status.toLowerCase()}">${i.status}</span></td>
            <td style="text-align:right"><button class="btn-edit" onclick="openEditModal('room', ${i.id})">Sửa</button> <button class="btn-danger" onclick="deleteItem('/Rooms', ${i.id}, '${i.roomName}')">Xóa</button></td></tr>`).join('')}</tbody></table>`;
    },

    beds: async () => {
        const data = await apiCall('/Beds');
        document.getElementById('section-container').innerHTML = `
            <div class="header-row"><h3>Quản lý Giường</h3> <button class="btn-primary" onclick="addItem('bed')">+ Thêm giường</button></div>
            <table><thead><tr><th>Tên giường</th><th>Phòng</th><th>Loại phòng</th><th>Trạng thái</th><th style="text-align:right">Thao tác</th></tr></thead>
            <tbody>${data.map(i => `<tr><td><strong>${i.bedName}</strong></td><td>${i.room?.roomName || 'N/A'}</td><td>${i.room?.roomType?.name || 'N/A'}</td><td><span class="badge badge-${i.status.toLowerCase()}">${i.status}</span></td>
            <td style="text-align:right"><button class="btn-edit" onclick="openEditModal('bed', ${i.id})">Sửa</button> <button class="btn-danger" onclick="deleteItem('/Beds', ${i.id}, '${i.bedName}')">Xóa</button></td></tr>`).join('')}</tbody></table>`;
    }
};

// --- Helpers ---
window.addItem = (type) => openCRUDModal(type);

window.assignStaff = async (id) => {
    const staffs = await apiCall('/Staffs');
    if (!staffs.length) return showToast('Không có nhân viên nào sẵn sàng.', 'error');
    
    const modal = document.getElementById('edit-modal');
    const fields = document.getElementById('modal-fields');
    const form = document.getElementById('edit-form');
    const title = document.getElementById('modal-title');
    
    title.textContent = 'Phân công nhân viên';
    modal.classList.remove('hidden');
    
    fields.innerHTML = `
        <div class="input-group">
            <label>Chọn kỹ thuật viên</label>
            <select name="staffId" required>
                <option value="">-- Chọn nhân viên --</option>
                ${staffs.map(s => `<option value="${s.id}">${s.fullName} - ${s.position}</option>`).join('')}
            </select>
        </div>
        <p style="font-size: 0.8rem; color: #64748b; margin-top: 10px;">Lưu ý: Hệ thống sẽ kiểm tra trùng lịch khi bạn xác nhận.</p>
    `;
    
    form.onsubmit = async (e) => {
        e.preventDefault();
        const staffId = parseInt(new FormData(e.target).get('staffId'));
        try {
            await apiCall(`/Appointments/${id}/AssignStaff`, 'PUT', staffId);
            modal.classList.add('hidden');
            showToast('Đã phân công nhân viên!');
            renderers.appointments();
        } catch (err) {
            // Lỗi trùng lịch hoặc lỗi khác sẽ được apiCall hiển thị toast
        }
    };
};

window.completeAppointment = async (id) => { await apiCall(`/Appointments/${id}/Complete`, 'PUT'); renderers.appointments(); };

// --- Init ---
async function initApp() {
    if (!state.token) return handleLogout();
    state.user = parseJwt(state.token);
    document.getElementById('auth-overlay').classList.add('hidden');
    document.getElementById('main-sidebar').classList.remove('hidden');
    document.getElementById('display-name').textContent = state.user.username;
    document.getElementById('display-role').textContent = state.user.role;
    document.getElementById('user-avatar').textContent = state.user.username.substring(0, 2).toUpperCase();

    document.querySelectorAll('.nav-item').forEach(item => {
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

document.getElementById('auth-form').onsubmit = (e) => document.getElementById('tab-login').classList.contains('active') ? handleLogin(e) : handleRegister(e);
document.getElementById('tab-login').onclick = () => switchAuthTab('login');
document.getElementById('tab-register').onclick = () => switchAuthTab('register');
document.getElementById('logout-btn').onclick = handleLogout;
document.getElementById('close-modal').onclick = () => document.getElementById('edit-modal').classList.add('hidden');

document.title = "Ctus Spa - Quản trị";
initApp();
