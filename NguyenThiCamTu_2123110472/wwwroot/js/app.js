/**
 * Ctus Spa CRM - Frontend Logic
 * Updated: 02/04/2026 - Final Full Version
 */

const API_BASE = window.location.origin + '/api';

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
            username: payload["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"],
            role: payload["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/role"],
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
            try { errorText = JSON.parse(errorText).message || errorText; } catch(e) {}
            throw new Error(errorText || 'Lỗi hệ thống');
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
function validateData(data) {
    if (data.phoneNumber && !/^0\d{9}$/.test(data.phoneNumber)) {
        showToast('Số điện thoại phải bắt đầu bằng số 0 và có 10 chữ số!', 'error');
        return false;
    }
    if (data.email && !data.email.includes('@')) {
        showToast('Email phải chứa ký tự @!', 'error');
        return false;
    }
    if (data.price !== undefined && data.price < 0) {
        showToast('Giá tiền không được nhỏ hơn 0!', 'error');
        return false;
    }
    if (data.discountPercent !== undefined && (data.discountPercent < 0 || data.discountPercent > 100)) {
        showToast('Khuyến mãi phải từ 0% đến 100%!', 'error');
        return false;
    }
    return true;
}

window.deleteItem = async (endpoint, id, name) => {
    if (!confirm(`Xóa "${name}"?`)) return;
    try {
        await apiCall(`${endpoint}/${id}`, 'DELETE');
        showToast('Đã xóa!');
        renderers[state.activeSection]();
    } catch (e) {}
};

window.openEditModal = async (type, id) => {
    const modal = document.getElementById('edit-modal');
    const fields = document.getElementById('modal-fields');
    const form = document.getElementById('edit-form');
    modal.classList.remove('hidden');
    
    const data = await apiCall(`/${type === 'product' ? 'Product' : type.charAt(0).toUpperCase() + type.slice(1) + 's'}/${id}`);
    
    let html = `<input type="hidden" name="id" value="${data.id}">`;
    if (type === 'customer' || type === 'staff') {
        html += `
            <div class="input-group"><label>Họ tên</label><input type="text" name="fullName" value="${data.fullName}" required></div>
            <div class="input-group"><label>Số điện thoại</label><input type="text" name="phoneNumber" value="${data.phoneNumber}"></div>
            ${type === 'customer' ? `<div class="input-group"><label>Email</label><input type="email" name="email" value="${data.email || ''}"></div>` : `<div class="input-group"><label>Vị trí</label><input type="text" name="position" value="${data.position || ''}"></div>`}
        `;
    } else if (type === 'service') {
        html += `
            <div class="input-group"><label>Tên dịch vụ</label><input type="text" name="name" value="${data.name}" required></div>
            <div class="input-group"><label>Giá (VNĐ)</label><input type="number" name="price" value="${data.price}" required></div>
            <div class="input-group"><label>Thời gian (phút)</label><input type="number" name="duration" value="${data.durationMinutes}" required></div>
        `;
    } else if (type === 'product') {
        html += `
            <div class="input-group"><label>Tên sản phẩm</label><input type="text" name="name" value="${data.name}" required></div>
            <div class="input-group"><label>Giá (VNĐ)</label><input type="number" name="price" value="${data.price}" required></div>
            <div class="input-group"><label>Tồn kho</label><input type="number" name="stock" value="${data.stockQuantity}" required></div>
        `;
    } else if (type === 'promotion') {
        html += `
            <div class="input-group"><label>Tên CTKM</label><input type="text" name="name" value="${data.name}" required></div>
            <div class="input-group"><label>Giảm (%)</label><input type="number" name="pct" value="${data.discountPercent}" required></div>
        `;
    }

    fields.innerHTML = html;
    form.onsubmit = async (e) => {
        e.preventDefault();
        let body = { id: data.id };
        const fd = new FormData(e.target);
        if (type === 'customer') body = {...body, fullName: fd.get('fullName'), phoneNumber: fd.get('phoneNumber'), email: fd.get('email')};
        if (type === 'staff') body = {...body, fullName: fd.get('fullName'), phoneNumber: fd.get('phoneNumber'), position: fd.get('position')};
        if (type === 'service') body = {...body, name: fd.get('name'), price: parseFloat(fd.get('price')), durationMinutes: parseInt(fd.get('duration'))};
        if (type === 'product') body = {...body, name: fd.get('name'), price: parseFloat(fd.get('price')), stockQuantity: parseInt(fd.get('stock'))};
        if (type === 'promotion') body = {...body, name: fd.get('name'), discountPercent: parseFloat(fd.get('pct')), startDate: data.startDate, endDate: data.endDate};

        if (!validateData(body)) return;
        const ep = type === 'product' ? '/Product' : `/${type.charAt(0).toUpperCase() + type.slice(1) + 's'}`;
        await apiCall(`${ep}/${id}`, 'PUT', body);
        modal.classList.add('hidden');
        showToast('Đã cập nhật!');
        renderers[state.activeSection]();
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

    commonList: async (type, title, endpoint, cols, mapper, canEveryoneAdd = false) => {
        const list = await apiCall(endpoint);
        const isAdmin = state.user?.role === 'Admin';
        const canAdd = isAdmin || canEveryoneAdd;
        const canEditDelete = isAdmin; // Default: only admin can edit/delete in list

        // Special case: Everyone can edit their own or simple entities? No, keep it as requested.
        // But for customers, let staff edit too? Let's check user rules. 
        // User said: "nhân viên không được thêm nhân viên, chỉ admin được xóa hóa đơn".
        // Usually staff CAN add/edit customers.
        const canManageCustomer = type === 'customer';
        
        document.getElementById('section-container').innerHTML = `
            <div class="table-controls">
                <input type="text" class="input-search" placeholder="Tìm kiếm ${title.toLowerCase()}...">
                ${(canAdd || canManageCustomer) ? `<button class="btn-primary" onclick="window.addItem('${type}')" style="width:auto">+ Thêm ${title}</button>` : ''}
            </div>
            <table><thead><tr>${cols.map(c => `<th>${c}</th>`).join('')}${(isAdmin || canManageCustomer) ? '<th style="text-align:right">Thao tác</th>' : ''}</tr></thead>
            <tbody>${list.map(item => `<tr>${mapper(item)}${(isAdmin || canManageCustomer) ? `
                <td style="text-align:right">
                    <button class="btn-edit" onclick="openEditModal('${type}', ${item.id})"><i class="fas fa-edit"></i></button>
                    <button class="btn-danger" onclick="deleteItem('${endpoint}', ${item.id}, '${item.name || item.fullName}')"><i class="fas fa-trash"></i></button>
                </td>` : ''}</tr>`).join('')}</tbody></table>
        `;
    },

    customers: () => renderers.commonList('customer', 'Khách hàng', '/Customers', ['ID', 'Họ tên', 'SĐT', 'Email'], i => `<td>#${i.id}</td><td><strong>${i.fullName}</strong></td><td>${i.phoneNumber}</td><td>${i.email || ''}</td>`, true),
    
    staffs: () => renderers.commonList('staff', 'Nhân viên', '/Staffs', ['ID', 'Họ tên', 'SĐT', 'Vị trí'], i => `<td>#${i.id}</td><td><strong>${i.fullName}</strong></td><td>${i.phoneNumber}</td><td>${i.position || ''}</td>`),
    
    services: () => renderers.commonList('service', 'Dịch vụ', '/Services', ['ID', 'Tên dịch vụ', 'Giá', 'Thời gian'], i => `<td>#${i.id}</td><td><strong>${i.name}</strong></td><td>${i.price.toLocaleString()}đ</td><td>${i.durationMinutes} phút</td>`),
    
    products: () => renderers.commonList('product', 'Sản phẩm', '/Product', ['ID', 'Tên sản phẩm', 'Giá', 'Tồn kho'], i => `<td>#${i.id}</td><td><strong>${i.name}</strong></td><td>${i.price.toLocaleString()}đ</td><td>${i.stockQuantity}</td>`),
    
    promotions: () => renderers.commonList('promotion', 'Khuyến mãi', '/Promotions', ['ID', 'Tên CTKM', 'Giảm %', 'Hạn dùng'], i => `<td>#${i.id}</td><td><strong>${i.name}</strong></td><td>${i.discountPercent}%</td><td>${new Date(i.endDate).toLocaleDateString()}</td>`),

    appointments: async () => {
        const [apps, customers, services] = await Promise.all([apiCall('/Appointments'), apiCall('/Customers'), apiCall('/Services')]);
        document.getElementById('section-container').innerHTML = `
            <div class="card glass" style="margin-bottom:30px"><h3>Tạo lịch hẹn mới</h3>
                <form id="booking-form"><div class="form-row">
                    <div class="input-group"><label>Khách hàng</label><select id="book-customer" required><option value="">-- Chọn khách --</option>${customers.map(c => `<option value="${c.id}">${c.fullName}</option>`).join('')}</select></div>
                    <div class="input-group"><label>Dịch vụ</label><select id="book-service" required><option value="">-- Chọn dịch vụ --</option>${services.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}</select></div>
                </div><div class="form-row">
                    <div class="input-group"><label>Ngày giờ</label><input type="datetime-local" id="book-date" required value="${new Date().toISOString().slice(0, 16)}"></div>
                    <div class="input-group" style="align-self:flex-end"><button type="submit" class="btn-primary">Xác nhận</button></div>
                </div></form></div>
            <table><thead><tr><th>Khách hàng</th><th>Ngày hẹn</th><th>Trạng thái</th><th>Dịch vụ</th><th style="text-align:right">Thao tác</th></tr></thead>
            <tbody>${apps.map(a => `<tr><td><strong>${a.customer?.fullName || 'N/A'}</strong></td><td>${new Date(a.appointmentDate).toLocaleString()}</td><td><span class="badge badge-${a.status.toLowerCase()}">${a.status}</span></td><td>${a.appointmentDetails?.map(d => d.service?.name).join(', ') || ''}</td>
            <td style="text-align:right">${a.status === 'Pending' ? `<button onclick="assignStaff(${a.id})" class="btn-edit" style="background:#10B981">Gán NV</button>` : ''} ${a.status === 'Assigned' ? `<button onclick="completeAppointment(${a.id})" class="btn-edit" style="background:#3B82F6">Xong</button>` : ''}
            <button class="btn-danger" onclick="deleteItem('/Appointments', ${a.id}, 'Lịch #${a.id}')">Hủy</button></td></tr>`).join('')}</tbody></table>
        `;
        document.getElementById('booking-form').onsubmit = async (e) => {
            e.preventDefault();
            await apiCall('/Appointments/Book', 'POST', { customerId: parseInt(document.getElementById('book-customer').value), appointmentDate: document.getElementById('book-date').value, serviceIds: [parseInt(document.getElementById('book-service').value)] });
            showToast('Đã đặt!'); renderers.appointments();
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
    }
};

// --- Helpers ---
window.addItem = async (type) => {
    let body = {};
    if (type === 'customer' || type === 'staff') {
        const n = prompt('Họ tên:'); const p = prompt('SĐT:'); if (!n) return;
        body = { fullName: n, phoneNumber: p, position: type === 'staff' ? prompt('Vị trí:') : undefined };
    } else if (type === 'product' || type === 'service') {
        const n = prompt('Tên:'); const p = prompt('Giá:'); if (!n) return;
        body = { name: n, price: parseFloat(p), stockQuantity: type === 'product' ? 100 : undefined, durationMinutes: type === 'service' ? 60 : undefined };
    } else if (type === 'promotion') {
        const n = prompt('Tên CTKM:'); const d = prompt('Giảm %:'); if (!n) return;
        body = { name: n, discountPercent: parseFloat(d), startDate: new Date(), endDate: new Date(Date.now() + 7*24*3600*1000) };
    }
    
    if (!validateData(body)) return;

    const ep = type === 'product' ? '/Product' : `/${type.charAt(0).toUpperCase() + type.slice(1) + 's'}`;
    await apiCall(ep, 'POST', body);
    showToast('Đã thêm!'); renderers[state.activeSection]();
};

window.assignStaff = async (id) => {
    const s = await apiCall('/Staffs'); if (!s.length) return showToast('Không có NV');
    const sid = prompt('ID NV:\n' + s.map(x => `${x.id}: ${x.fullName}`).join('\n'));
    if (sid) { await apiCall(`/Appointments/${id}/AssignStaff`, 'PUT', parseInt(sid)); renderers.appointments(); }
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
