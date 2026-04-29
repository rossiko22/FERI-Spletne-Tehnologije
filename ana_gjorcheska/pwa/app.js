const API_BASE = 'http://localhost:3000';

let accessToken = '';

function getAuthHeaders(extraHeaders = {}) {
    return {
        ...extraHeaders,
        'Authorization': 'Bearer ' + accessToken
    };
}

async function getToken() {
    const res = await fetch(`${API_BASE}/oauth/token`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
            grant_type: 'client_credentials',
            client_id: 'fitness-client',
            client_secret: 'super-secret-client-key'
        })
    });

    const data = await res.json();
    accessToken = data.access_token;
    console.log('TOKEN:', accessToken);
}

let currentResource = 'workouts';
let currentData = [];

const dataList = document.getElementById('dataList');
const dataForm = document.getElementById('dataForm');
const field1 = document.getElementById('field1');
const field2 = document.getElementById('field2');
const editIndex = document.getElementById('editIndex');
const searchInput = document.getElementById('searchInput');
const formTitle = document.getElementById('formTitle');
const listTitle = document.getElementById('listTitle');

document.getElementById('showWorkoutsBtn').addEventListener('click', () => switchResource('workouts'));
document.getElementById('showHabitsBtn').addEventListener('click', () => switchResource('habits'));
document.getElementById('showMealsBtn').addEventListener('click', () => switchResource('meals'));
document.getElementById('refreshBtn').addEventListener('click', fetchData);


document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        dataForm.requestSubmit();
    }

    if (e.ctrlKey && e.key === 'r') {
        e.preventDefault();
        fetchData();
    }
});

searchInput.addEventListener('input', renderList);

function switchResource(resource) {
    currentResource = resource;
    editIndex.value = '';
    dataForm.reset();

    if (resource === 'workouts') {
        formTitle.textContent = 'Dodaj workout';
        listTitle.textContent = 'Seznam workouts';
        field1.placeholder = 'Tip treninga';
        field2.placeholder = 'Trajanje';
    } else if (resource === 'habits') {
        formTitle.textContent = 'Dodaj habit';
        listTitle.textContent = 'Seznam habits';
        field1.placeholder = 'Naziv navade';
        field2.placeholder = 'Cilj';
    } else if (resource === 'meals') {
        formTitle.textContent = 'Dodaj meal';
        listTitle.textContent = 'Seznam meals';
        field1.placeholder = 'Naziv obroka';
        field2.placeholder = 'Kalorije';
    }

    fetchData();
}

async function fetchData() {
    try {
        if (!accessToken) {
            await getToken();
        }

        const response = await fetch(`${API_BASE}/${currentResource}`, {
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            throw new Error('HTTP error: ' + response.status);
        }

        const data = await response.json();

        if (!Array.isArray(data)) {
            currentData = [];
        } else {
            currentData = data;
        }

        localStorage.setItem(currentResource, JSON.stringify(currentData));
        renderList();
        showNotification('Podatki uspešno pridobljeni.');
    } catch (error) {
        console.error('Napaka pri pridobivanju:', error);

        const cached = localStorage.getItem(currentResource);
        currentData = cached ? JSON.parse(cached) : [];
        renderList();
        showNotification('Povezava ni na voljo. Prikazujem lokalne podatke.');
    }
}

async function showNotification(message) {
    if (!('Notification' in window)) {
        return;
    }

    if (Notification.permission === 'default') {
        await Notification.requestPermission();
    }

    if (Notification.permission === 'granted') {
        new Notification('Fitness Buddy', {
            body: message,
            icon: 'icons/icon-192.png'
        });
    }
}

function renderList() {
    const query = searchInput.value.toLowerCase();

    dataList.innerHTML = '';

    const filtered = currentData.filter(item =>
        JSON.stringify(item).toLowerCase().includes(query)
    );

    filtered.forEach((item, index) => {
        const li = document.createElement('li');

        li.innerHTML = `
            <div><strong>${JSON.stringify(item)}</strong></div>
            <div class="item-actions">
                <button onclick="editItem(${index})">Uredi</button>
                <button onclick="deleteItem(${index})">Izbriši</button>
            </div>
        `;

        dataList.appendChild(li);
    });
}

dataForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const value1 = field1.value;
    const value2 = field2.value;

    let payload = {};

    if (currentResource === 'workouts') {
        payload = { tip_treninga: value1, trajanje: Number(value2) };
    } else if (currentResource === 'habits') {
        payload = { naziv: value1, cilj: value2 };
    } else if (currentResource === 'meals') {
        payload = { naziv_obroka: value1, kalorije: Number(value2) };
    }

    const index = editIndex.value;

    try {
        if (index === '') {
            await fetch(`${API_BASE}/${currentResource}`, {
                method: 'POST',
                headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
                body: JSON.stringify(payload)
            });
            showNotification('Podatek uspešno shranjen.');
        } else {
            await fetch(`${API_BASE}/${currentResource}/${index}`, {
                method: 'PUT',
                headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
                body: JSON.stringify(payload)
            });
            showNotification('Podatek uspešno posodobljen.');
        }

        dataForm.reset();
        editIndex.value = '';
        fetchData();
    } catch (error) {
        queueOfflineAction(index === '' ? 'POST' : 'PUT', payload, index);
        showNotification('Povezava ni na voljo. Akcija je shranjena za kasnejšo sinhronizacijo.');
    }
});

window.editItem = function(index) {
    const item = currentData[index];
    editIndex.value = index;

    if (currentResource === 'workouts') {
        field1.value = item.tip_treninga || '';
        field2.value = item.trajanje || '';
    } else if (currentResource === 'habits') {
        field1.value = item.naziv || '';
        field2.value = item.cilj || '';
    } else if (currentResource === 'meals') {
        field1.value = item.naziv_obroka || '';
        field2.value = item.kalorije || '';
    }
};

window.deleteItem = async function(index) {
    try {
        await fetch(`${API_BASE}/${currentResource}/${index}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        showNotification('Podatek izbrisan.');
        fetchData();
    } catch (error) {
        queueOfflineAction('DELETE', null, index);
        showNotification('Brisanje bo izvedeno ob ponovni povezavi.');
    }
};

function queueOfflineAction(method, payload, id = null) {
    const queue = JSON.parse(localStorage.getItem('offlineQueue') || '[]');

    queue.push({
        resource: currentResource,
        method,
        payload,
        id
    });

    localStorage.setItem('offlineQueue', JSON.stringify(queue));
}

async function syncOfflineActions() {
    const queue = JSON.parse(localStorage.getItem('offlineQueue') || '[]');
    if (queue.length === 0) return;

    const remaining = [];

    for (const action of queue) {
        try {
            let url = `${API_BASE}/${action.resource}`;
            if (action.id !== null && action.id !== '') {
                url += `/${action.id}`;
            }

            await fetch(url, {
                method: action.method,
                headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
                body: action.payload ? JSON.stringify(action.payload) : undefined
            });
        } catch (error) {
            remaining.push(action);
        }
    }

    localStorage.setItem('offlineQueue', JSON.stringify(remaining));
}

window.addEventListener('online', async () => {
    await syncOfflineActions();
    fetchData();
    showNotification('Povezava je znova vzpostavljena. Podatki so sinhronizirani.');
});

function setupLazyLoading() {
    const images = document.querySelectorAll('.lazy-image');

    const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                obs.unobserve(img);
            }
        });
    });

    images.forEach(img => observer.observe(img));
}

document.addEventListener('DOMContentLoaded', async () => {
    await getToken();
    switchResource('workouts');   // naloži začetne podatke
    setupLazyLoading();           // aktivira lazy loading slik
});
