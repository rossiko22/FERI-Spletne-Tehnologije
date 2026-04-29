// ===== Constants =====
const API = '';  // same origin
let currentTab = 'workouts';
let editingId = null;
let editingResource = null;
let allData = { workouts: [], habits: [], meals: [], users: [] };
let isOnline = navigator.onLine;

// ===== Service Worker Registration =====
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').then(reg => {
        console.log('SW registered:', reg.scope);
    }).catch(err => console.warn('SW registration failed:', err));

    navigator.serviceWorker.addEventListener('message', e => {
        if (e.data?.type === 'SYNC_PENDING') syncPendingOperations();
    });
}

// ===== Token Management =====
async function getToken() {
    const token = localStorage.getItem('fb_token');
    const expiry = localStorage.getItem('fb_token_expiry');
    if (token && expiry && Date.now() < parseInt(expiry)) return token;

    const res = await fetch(`${API}/oauth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            grant_type: 'client_credentials',
            client_id: 'fitness_client',
            client_secret: 'tajni_kljuc_fitness'
        })
    });
    if (!res.ok) throw new Error('Auth failed');
    const data = await res.json();
    localStorage.setItem('fb_token', data.access_token);
    localStorage.setItem('fb_token_expiry', String(Date.now() + data.expires_in * 1000 - 30000));
    return data.access_token;
}

async function apiFetch(path, options = {}) {
    const token = await getToken();
    const res = await fetch(`${API}${path}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
            ...options.headers
        }
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.napaka || err.error || `HTTP ${res.status}`);
    }
    return res.json();
}

// ===== Toast Notifications =====
function showToast(message, type = 'info', duration = 4000) {
    const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <span class="toast-icon">${icons[type]}</span>
        <span class="toast-message">${message}</span>
        <button class="toast-close" aria-label="Zapri">✕</button>`;
    toast.querySelector('.toast-close').onclick = () => toast.remove();
    container.appendChild(toast);
    setTimeout(() => toast.remove(), duration);

    // Also fire OS notification for important events
    if ((type === 'success' || type === 'error') && Notification.permission === 'granted') {
        new Notification('FitnessBuddy', { body: message, icon: '/icons/icon-192.svg', silent: true });
    }
}

// ===== OS Notification Permission =====
function requestNotificationPermission() {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'default') {
        Notification.requestPermission().then(perm => {
            if (perm === 'granted') showToast('Obvestila omogočena!', 'success');
        });
    }
}

// ===== Online / Offline Status =====
function updateOnlineStatus() {
    isOnline = navigator.onLine;
    const dot = document.getElementById('status-dot');
    const text = document.getElementById('status-text');
    const banner = document.getElementById('offline-banner');

    dot.className = 'status-dot' + (isOnline ? '' : ' offline');
    text.textContent = isOnline ? 'Povezan s strežnikom' : 'Brez povezave — lokalni podatki';
    banner.classList.toggle('visible', !isOnline);

    if (isOnline) syncPendingOperations();
}

window.addEventListener('online', updateOnlineStatus);
window.addEventListener('offline', updateOnlineStatus);

// ===== IndexedDB Sync =====
async function syncPendingOperations() {
    if (!isOnline) return;
    let pending;
    try { pending = await getPending(); } catch { return; }
    if (!pending.length) return;

    showToast(`Sinhroniziram ${pending.length} čakajočih operacij...`, 'info');
    let synced = 0;
    for (const op of pending) {
        try {
            await apiFetch(op.url, { method: op.method, body: op.body ? JSON.stringify(op.body) : undefined });
            await removePending(op.id);
            synced++;
        } catch (err) {
            console.warn('Sync failed for op', op.id, err);
        }
    }
    if (synced) {
        showToast(`Sinhronizirano ${synced} operacij`, 'success');
        loadCurrentTab();
    }
    updatePendingBadge();
}

async function updatePendingBadge() {
    try {
        const pending = await getPending();
        const el = document.getElementById('pending-indicator');
        el.innerHTML = pending.length
            ? `<span class="pending-badge">⏳ ${pending.length} čaka na sync</span>`
            : '';
    } catch {}
}

// ===== Data Loading =====
async function loadResource(resource) {
    const loaderEl = document.getElementById(`loader-${resource}`);
    const listEl = document.getElementById(`list-${resource}`);
    if (loaderEl) loaderEl.style.display = 'flex';

    try {
        let items;
        if (isOnline) {
            items = await apiFetch(`/api/${resource}`);
            await localSaveAll(resource, items);
        } else {
            items = await localGetAll(resource);
        }
        allData[resource] = items;
        renderList(resource, items);
        const countEl = document.getElementById(`count-${resource}`);
        if (countEl) countEl.textContent = items.length;
    } catch (err) {
        // Fallback to IndexedDB
        try {
            const items = await localGetAll(resource);
            allData[resource] = items;
            renderList(resource, items);
        } catch {
            if (listEl) listEl.innerHTML = `<p style="color:var(--error)">Napaka: ${err.message}</p>`;
        }
    } finally {
        if (loaderEl) loaderEl.style.display = 'none';
    }
}

function loadCurrentTab() {
    if (currentTab !== 'push') loadResource(currentTab);
}

// ===== Lazy Loading with IntersectionObserver =====
const imageObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const img = entry.target;
            img.src = img.dataset.src;
            img.classList.add('loaded');
            img.classList.remove('lazy');
            observer.unobserve(img);
        }
    });
}, { rootMargin: '50px' });

function lazyLoadImages() {
    document.querySelectorAll('img.lazy[data-src]').forEach(img => imageObserver.observe(img));
}

// ===== Workout type → icon mapping =====
function workoutIcon(tipTreninga) {
    const t = (tipTreninga || '').toLowerCase();
    if (t.includes('tek') || t.includes('run')) return '/icons/workout-running.svg';
    if (t.includes('kolo') || t.includes('cycling') || t.includes('bicikl')) return '/icons/workout-cycling.svg';
    if (t.includes('plav') || t.includes('swim')) return '/icons/workout-swimming.svg';
    if (t.includes('joga') || t.includes('yoga')) return '/icons/workout-yoga.svg';
    if (t.includes('gym') || t.includes('fitnes') || t.includes('utezi')) return '/icons/workout-gym.svg';
    return '/icons/workout-default.svg';
}

// ===== Render Functions =====
function renderList(resource, items) {
    const listEl = document.getElementById(`list-${resource}`);
    if (!listEl) return;

    const query = document.getElementById('search-input').value.toLowerCase().trim();
    const filtered = query ? items.filter(item => JSON.stringify(item).toLowerCase().includes(query)) : items;

    if (!filtered.length) {
        listEl.innerHTML = `
            <div class="empty-state" style="grid-column:1/-1">
                <div class="empty-icon">${resource === 'workouts' ? '🏋️' : resource === 'habits' ? '✅' : resource === 'meals' ? '🥗' : '👤'}</div>
                <p>${query ? 'Ni rezultatov za iskanje.' : 'Ni podatkov. Dodajte prvi vnos!'}</p>
                ${!query ? `<button class="btn btn-primary" onclick="openNewForm()">+ Dodaj</button>` : ''}
            </div>`;
        return;
    }

    listEl.innerHTML = filtered.map(item => renderCard(resource, item)).join('');
    lazyLoadImages();
}

function renderCard(resource, item) {
    if (resource === 'workouts') return renderWorkoutCard(item);
    if (resource === 'habits') return renderHabitCard(item);
    if (resource === 'meals') return renderMealCard(item);
    if (resource === 'users') return renderUserCard(item);
    return '';
}

function renderWorkoutCard(w) {
    const iconSrc = workoutIcon(w.tip_treninga);
    return `
    <div class="card" data-id="${w.id}" data-resource="workouts">
        <img class="card-image lazy" data-src="${iconSrc}" src="" alt="${w.tip_treninga}" width="120" height="80"/>
        <div class="card-body">
            <div class="card-title">${escHtml(w.tip_treninga)}</div>
            <div class="card-meta">
                <span class="tag">📅 ${escHtml(w.datum)}</span>
                <span class="tag green">⏱ ${w.trajanje} min</span>
                <span class="tag">👤 User #${w.user_id}</span>
            </div>
        </div>
        <div class="card-actions">
            <button class="btn btn-ghost btn-sm" onclick="openEditForm('workouts',${w.id})">✏️ Uredi</button>
            <button class="btn btn-danger btn-sm" onclick="deleteItem('workouts',${w.id})">🗑 Izbriši</button>
        </div>
    </div>`;
}

function renderHabitCard(h) {
    return `
    <div class="card" data-id="${h.id}" data-resource="habits">
        <div class="card-body">
            <div class="card-title">✅ ${escHtml(h.naziv)}</div>
            <div class="card-meta">
                <span class="tag green">🎯 ${escHtml(h.cilj)}</span>
                <span class="tag">👤 User #${h.user_id}</span>
            </div>
        </div>
        <div class="card-actions">
            <button class="btn btn-ghost btn-sm" onclick="openEditForm('habits',${h.id})">✏️ Uredi</button>
            <button class="btn btn-danger btn-sm" onclick="deleteItem('habits',${h.id})">🗑 Izbriši</button>
        </div>
    </div>`;
}

function renderMealCard(m) {
    const kcal = parseInt(m.kalorije) || 0;
    const tag = kcal > 600 ? 'red' : kcal > 300 ? 'yellow' : 'green';
    return `
    <div class="card" data-id="${m.id}" data-resource="meals">
        <div class="card-body">
            <div class="card-title">🥗 ${escHtml(m.naziv_obroka)}</div>
            <div class="card-meta">
                <span class="tag">🕐 ${escHtml(m.cas)}</span>
                <span class="tag ${tag}">🔥 ${m.kalorije} kcal</span>
                <span class="tag">👤 User #${m.user_id}</span>
            </div>
        </div>
        <div class="card-actions">
            <button class="btn btn-ghost btn-sm" onclick="openEditForm('meals',${m.id})">✏️ Uredi</button>
            <button class="btn btn-danger btn-sm" onclick="deleteItem('meals',${m.id})">🗑 Izbriši</button>
        </div>
    </div>`;
}

function renderUserCard(u) {
    return `
    <div class="card" data-id="${u.id}" data-resource="users">
        <div class="card-body">
            <div class="card-title">👤 ${escHtml(u.ime)}</div>
            <div class="card-meta">
                <span class="tag">📧 ${escHtml(u.email)}</span>
                <span class="tag green">📅 ${escHtml(u.datum_registracije)}</span>
            </div>
        </div>
        <div class="card-actions">
            <button class="btn btn-ghost btn-sm" onclick="openEditForm('users',${u.id})">✏️ Uredi</button>
            <button class="btn btn-danger btn-sm" onclick="deleteItem('users',${u.id})">🗑 Izbriši</button>
        </div>
    </div>`;
}

function escHtml(str) {
    return String(str ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ===== Search =====
document.getElementById('search-input').addEventListener('input', () => {
    if (currentTab !== 'push') renderList(currentTab, allData[currentTab] || []);
});

document.getElementById('btn-clear-search').addEventListener('click', () => {
    document.getElementById('search-input').value = '';
    if (currentTab !== 'push') renderList(currentTab, allData[currentTab] || []);
    document.getElementById('search-input').focus();
});

// ===== Tab Navigation =====
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

function switchTab(tab) {
    currentTab = tab;
    document.querySelectorAll('.tab-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.tab === tab);
        b.setAttribute('aria-selected', b.dataset.tab === tab);
    });
    document.querySelectorAll('.tab-panel').forEach(p => {
        p.classList.toggle('active', p.id === `tab-${tab}`);
    });
    if (tab !== 'push') loadResource(tab);
}

// ===== Modal Forms =====
const FIELD_DEFS = {
    workouts: [
        { name: 'user_id', label: 'User ID', type: 'number', required: true },
        { name: 'datum', label: 'Datum', type: 'date', required: true },
        { name: 'trajanje', label: 'Trajanje (min)', type: 'number', required: true },
        { name: 'tip_treninga', label: 'Tip treninga', type: 'text', required: true, placeholder: 'npr. Tek, Kolesarjenje...' }
    ],
    habits: [
        { name: 'user_id', label: 'User ID', type: 'number', required: true },
        { name: 'naziv', label: 'Naziv navade', type: 'text', required: true },
        { name: 'cilj', label: 'Cilj', type: 'text', required: true }
    ],
    meals: [
        { name: 'user_id', label: 'User ID', type: 'number', required: true },
        { name: 'naziv_obroka', label: 'Naziv obroka', type: 'text', required: true },
        { name: 'cas', label: 'Čas', type: 'time', required: true },
        { name: 'kalorije', label: 'Kalorije', type: 'number', required: true }
    ],
    users: [
        { name: 'ime', label: 'Ime in priimek', type: 'text', required: true },
        { name: 'email', label: 'E-mail', type: 'email', required: true },
        { name: 'geslo', label: 'Geslo', type: 'password', required: true }
    ]
};

function openNewForm() {
    const resource = currentTab === 'push' ? 'workouts' : currentTab;
    editingId = null;
    editingResource = resource;
    renderForm(resource, {});
    document.getElementById('modal-title').textContent = `Dodaj ${resourceLabel(resource)}`;
    document.getElementById('modal-overlay').classList.remove('hidden');
    document.querySelector('#item-form .form-control')?.focus();
}

function openEditForm(resource, id) {
    const item = allData[resource]?.find(i => i.id === id);
    if (!item) return;
    editingId = id;
    editingResource = resource;
    renderForm(resource, item);
    document.getElementById('modal-title').textContent = `Uredi ${resourceLabel(resource)}`;
    document.getElementById('modal-overlay').classList.remove('hidden');
}

function renderForm(resource, data) {
    const fields = FIELD_DEFS[resource] || [];
    document.getElementById('form-fields').innerHTML = fields.map(f => `
        <div class="form-group">
            <label for="f-${f.name}">${f.label}${f.required ? ' *' : ''}</label>
            <input
                class="form-control"
                id="f-${f.name}"
                name="${f.name}"
                type="${f.type}"
                value="${escHtml(data[f.name] ?? '')}"
                ${f.required ? 'required' : ''}
                ${f.placeholder ? `placeholder="${f.placeholder}"` : ''}
                ${f.type === 'password' ? 'autocomplete="new-password"' : ''}
            />
        </div>`).join('');
}

function closeModal() {
    document.getElementById('modal-overlay').classList.add('hidden');
    editingId = null;
    editingResource = null;
}

document.getElementById('btn-modal-close').addEventListener('click', closeModal);
document.getElementById('btn-form-cancel').addEventListener('click', closeModal);
document.getElementById('modal-overlay').addEventListener('click', e => {
    if (e.target === document.getElementById('modal-overlay')) closeModal();
});

// ===== Form Submit =====
document.getElementById('item-form').addEventListener('submit', async e => {
    e.preventDefault();
    const resource = editingResource;
    const fields = FIELD_DEFS[resource] || [];
    const body = {};
    let valid = true;

    fields.forEach(f => {
        const el = document.getElementById(`f-${f.name}`);
        const val = el.value.trim();
        if (f.required && !val) { el.style.borderColor = 'var(--error)'; valid = false; }
        else { el.style.borderColor = ''; body[f.name] = f.type === 'number' ? Number(val) : val; }
    });

    if (!valid) { showToast('Izpolnite vsa obvezna polja', 'warning'); return; }

    const btn = document.getElementById('btn-form-submit');
    btn.disabled = true;
    btn.textContent = 'Shranjujem...';

    try {
        if (isOnline) {
            if (editingId) {
                await apiFetch(`/api/${resource}/${editingId}`, { method: 'PUT', body: JSON.stringify(body) });
                showToast(`${resourceLabel(resource)} uspešno posodobljen/a!`, 'success');
            } else {
                await apiFetch(`/api/${resource}`, { method: 'POST', body: JSON.stringify(body) });
                showToast(`${resourceLabel(resource)} uspešno dodan/a!`, 'success');
            }
        } else {
            // Queue for sync
            const method = editingId ? 'PUT' : 'POST';
            const url = editingId ? `/api/${resource}/${editingId}` : `/api/${resource}`;
            await addPending({ resource, method, url, body });
            // Optimistic local update
            if (editingId) {
                const idx = allData[resource].findIndex(i => i.id === editingId);
                if (idx !== -1) { allData[resource][idx] = { ...allData[resource][idx], ...body }; await localPut(resource, allData[resource][idx]); }
            } else {
                const tempItem = { ...body, id: Date.now() };
                allData[resource].unshift(tempItem);
                await localPut(resource, tempItem);
            }
            showToast('Shranjeno lokalno — sinhronizirano bo ob vzpostavitvi povezave', 'warning');
        }
        closeModal();
        await loadResource(resource);
        updatePendingBadge();
    } catch (err) {
        showToast(`Napaka: ${err.message}`, 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Shrani';
    }
});

// ===== Delete =====
async function deleteItem(resource, id) {
    if (!confirm(`Ste prepričani, da želite izbrisati ta vnos?`)) return;

    try {
        if (isOnline) {
            await apiFetch(`/api/${resource}/${id}`, { method: 'DELETE' });
            showToast(`${resourceLabel(resource)} izbrisan/a`, 'success');
        } else {
            await addPending({ resource, method: 'DELETE', url: `/api/${resource}/${id}` });
            await localDelete(resource, id);
            showToast('Označeno za brisanje — sinhronizirano bo ob vzpostavitvi povezave', 'warning');
        }
        allData[resource] = allData[resource].filter(i => i.id !== id);
        renderList(resource, allData[resource]);
        const countEl = document.getElementById(`count-${resource}`);
        if (countEl) countEl.textContent = allData[resource].length;
        updatePendingBadge();
    } catch (err) {
        showToast(`Napaka pri brisanju: ${err.message}`, 'error');
    }
}

// ===== Push Notifications =====
let pushSubscription = null;

async function subscribeToPush() {
    if (!('PushManager' in window)) {
        showToast('Push obvestila niso podprta v tem brskalniku', 'warning');
        return;
    }

    try {
        const perm = await Notification.requestPermission();
        if (perm !== 'granted') { showToast('Push obvestila so onemogočena', 'warning'); return; }

        const reg = await navigator.serviceWorker.ready;
        const keyRes = await fetch('/api/push/vapid-public-key');
        const { publicKey } = await keyRes.json();

        pushSubscription = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(publicKey)
        });

        await apiFetch('/api/push/subscribe', { method: 'POST', body: JSON.stringify(pushSubscription) });
        localStorage.setItem('push_subscribed', '1');
        document.getElementById('btn-push').classList.add('active');
        document.getElementById('push-status').textContent = '✅ Naročeni ste na push obvestila!';
        showToast('Naročeni ste na push obvestila!', 'success');
    } catch (err) {
        showToast(`Push napaka: ${err.message}`, 'error');
    }
}

async function sendPushNotification() {
    const title = document.getElementById('push-title').value.trim() || 'FitnessBuddy';
    const body = document.getElementById('push-body').value.trim();
    if (!body) { showToast('Vnesite sporočilo', 'warning'); return; }

    try {
        const result = await apiFetch('/api/push/send', {
            method: 'POST',
            body: JSON.stringify({ title, body })
        });
        showToast(`Push obvestilo poslano ${result.sent} napravam`, 'success');
        document.getElementById('push-body').value = '';
    } catch (err) {
        showToast(`Napaka pri pošiljanju: ${err.message}`, 'error');
    }
}

function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = atob(base64);
    return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

document.getElementById('btn-subscribe-push').addEventListener('click', subscribeToPush);
document.getElementById('btn-send-push').addEventListener('click', sendPushNotification);
document.getElementById('btn-push').addEventListener('click', () => switchTab('push'));

// ===== Help modal =====
function openHelp() {
    document.getElementById('help-overlay').classList.remove('hidden');
}
function closeHelp() {
    document.getElementById('help-overlay').classList.add('hidden');
}
document.getElementById('btn-help').addEventListener('click', openHelp);
document.getElementById('btn-help-close').addEventListener('click', closeHelp);
document.getElementById('help-overlay').addEventListener('click', e => {
    if (e.target === document.getElementById('help-overlay')) closeHelp();
});

// Auto-restore subscription on load
if (localStorage.getItem('push_subscribed') === '1') {
    document.getElementById('btn-push').classList.add('active');
}

// ===== FAB and new item buttons =====
document.getElementById('fab').addEventListener('click', openNewForm);
document.getElementById('btn-new-workout').addEventListener('click', () => { switchTab('workouts'); setTimeout(openNewForm, 0); });
document.getElementById('btn-new-habit').addEventListener('click', () => { switchTab('habits'); setTimeout(openNewForm, 0); });
document.getElementById('btn-new-meal').addEventListener('click', () => { switchTab('meals'); setTimeout(openNewForm, 0); });
document.getElementById('btn-new-user').addEventListener('click', () => { switchTab('users'); setTimeout(openNewForm, 0); });

// ===== Sync button =====
document.getElementById('btn-sync').addEventListener('click', async () => {
    document.getElementById('btn-sync').style.opacity = '0.5';
    await loadCurrentTab();
    await syncPendingOperations();
    document.getElementById('btn-sync').style.opacity = '';
    showToast('Podatki osveženi', 'info');
});

// ===== Keyboard Shortcuts =====
// Ctrl+N / Ctrl+F / Ctrl+R are reserved by browsers — avoided.
// Shortcut map (active only when focus is NOT inside an input/modal):
//   /        → focus search bar
//   N        → open "add new" form for current tab
//   R        → refresh / reload current tab data
//   1–4      → switch tabs (workouts / habits / meals / users)
//   Escape   → close modal
//   Ctrl+M   → toggle voice recognition (handled in voice.js)
document.addEventListener('keydown', e => {
    const inInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName);
    const modalOpen = !document.getElementById('modal-overlay').classList.contains('hidden');
    const noMod = !e.ctrlKey && !e.altKey && !e.metaKey && !e.shiftKey;

    // Escape — close modal or help (always active)
    if (e.key === 'Escape') {
        const helpOpen = !document.getElementById('help-overlay').classList.contains('hidden');
        if (helpOpen) { closeHelp(); return; }
        if (modalOpen) { closeModal(); return; }
    }

    // All remaining shortcuts are suppressed when typing in an input or inside an open modal
    if (inInput || modalOpen) return;

    // ? → open help
    if (e.key === '?' && noMod) {
        openHelp();
        return;
    }

    // / → focus search
    if (e.key === '/' && noMod) {
        e.preventDefault();
        const inp = document.getElementById('search-input');
        inp.focus();
        inp.select();
        return;
    }

    // N → add new item for the active tab
    if ((e.key === 'n' || e.key === 'N') && noMod) {
        e.preventDefault();
        openNewForm();
        showToast('Dodajanje novega vnosa (tipka N)', 'info', 2000);
        return;
    }

    // R → refresh current tab
    if ((e.key === 'r' || e.key === 'R') && noMod) {
        e.preventDefault();
        loadCurrentTab();
        showToast('Podatki se osvežujejo… (tipka R)', 'info', 2000);
        return;
    }

    // 1–4 → tab switching
    if (noMod) {
        if (e.key === '1') switchTab('workouts');
        else if (e.key === '2') switchTab('habits');
        else if (e.key === '3') switchTab('meals');
        else if (e.key === '4') switchTab('users');
    }
});

// ===== Helpers =====
function resourceLabel(resource) {
    return { workouts: 'Trening', habits: 'Navada', meals: 'Obrok', users: 'Uporabnik' }[resource] || resource;
}

// ===== URL params: handle manifest shortcuts =====
(function handleUrlParams() {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    const action = params.get('action');
    if (tab) switchTab(tab);
    if (action === 'new') setTimeout(openNewForm, 300);
})();

// ===== Initial Load =====
updateOnlineStatus();
requestNotificationPermission();
loadResource('workouts');
updatePendingBadge();
