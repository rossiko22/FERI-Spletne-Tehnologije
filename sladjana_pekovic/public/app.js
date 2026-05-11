const API_URL = 'http://localhost:3001';

let accessToken = localStorage.getItem('accessToken') || null;

const loginBtn = document.getElementById('loginBtn');
const addWorkoutBtn = document.getElementById('addWorkoutBtn');
const searchInput = document.getElementById('searchInput');
const workoutsContainer = document.getElementById('workoutsContainer');
const voiceBtn = document.getElementById('voiceBtn');
const voiceStatus = document.getElementById('voiceStatus');

loginBtn.addEventListener('click', login);
addWorkoutBtn.addEventListener('click', addWorkout);
searchInput.addEventListener('input', loadWorkouts);

if (voiceBtn) {
    voiceBtn.addEventListener('click', startVoiceRecognition);
}

window.addEventListener('load', () => {
    requestNotificationPermission();
    registerServiceWorker();

    if (accessToken) {
        loadWorkouts();
    }
});

window.addEventListener('online', () => {
    showNotification('Fitness Buddy', 'Povezava je ponovno vzpostavljena.');
    speak('Povezava je ponovno vzpostavljena.');
    syncOfflineWorkouts();
});

document.addEventListener('keydown', (event) => {
    // Ctrl + N = fokus na dodajanje novega treninga
    if (event.ctrlKey && event.key.toLowerCase() === 'n') {
        event.preventDefault();
        document.getElementById('title').focus();
    }

    // Ctrl + F = fokus na iskanje
    if (event.ctrlKey && event.key.toLowerCase() === 'f') {
        event.preventDefault();
        searchInput.focus();
    }
});

// GLASOVNO UPRAVLJANJE
function startVoiceRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
        updateVoiceStatus('Brskalnik ne podpira prepoznave govora.');
        speak('Brskalnik ne podpira prepoznave govora.');
        return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'sl-SI';
    recognition.continuous = false;
    recognition.interimResults = false;

    updateVoiceStatus('Poslušam glasovni ukaz...');
    

    recognition.start();

    recognition.onresult = (event) => {
        const command = event.results[0][0].transcript.toLowerCase().trim();
        updateVoiceStatus(`Prepoznan ukaz: ${command}`);
        handleVoiceCommand(command);
    };

    recognition.onerror = () => {
        updateVoiceStatus('Napaka pri prepoznavi govora.');
        speak('Ukaza nisem razumela.');
    };

    recognition.onend = () => {
        console.log('Glasovno poslušanje zaključeno.');
    };
}

function handleVoiceCommand(command) {
   if (
    command.includes('prikaži treninge') ||
    command.includes('prikazi treninge') ||
    command.includes('pokaži treninge') ||
    command.includes('pokazi treninge') ||
    command.includes('prikaži') ||
    command.includes('prikazi') ||
    command.includes('treninge') ||
    command.includes('trening')
) {
    loadWorkouts();
    speak('Prikazujem treninge.');
    return;
}

    if (command.includes('išči cardio') || command.includes('isci cardio') || command.includes('išči kardio')) {
        searchInput.value = 'cardio';
        loadWorkouts();
        speak('Iščem cardio treninge.');
        return;
    }

    if (command.includes('počisti obrazec') || command.includes('pocisti obrazec')) {
        clearForm();
        speak('Obrazec je počiščen.');
        return;
    }

   if (
    command.includes('fokus iskanje') ||
    command.includes('iskanje') ||
    command.includes('išči') ||
    command.includes('isci') ||
    command.includes('išče') ||
    command.includes('isce')
) {
    searchInput.focus();
    speak('Fokus je na iskanju.');
    return;
}

    updateVoiceStatus('Ukaz ni prepoznan.');
    speak('Ukaz ni prepoznan.');
}

function updateVoiceStatus(message) {
    if (voiceStatus) {
        voiceStatus.textContent = message;
    }
}

function speak(text) {
    if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'sl-SI';
        window.speechSynthesis.speak(utterance);
    }
}

async function login() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    try {
        const response = await fetch(`${API_URL}/oauth/token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username,
                password,
                grant_type: 'password'
            })
        });

        const data = await response.json();

        if (!response.ok) {
            showNotification('Napaka', data.message || 'Prijava ni uspela.');
            speak('Prijava ni uspela.');
            return;
        }

        accessToken = data.access_token;
        localStorage.setItem('accessToken', accessToken);

        showNotification('Prijava uspešna', 'Access token je bil shranjen.');
        speak('Prijava je uspešna.');
        loadWorkouts();

    } catch (error) {
        showNotification('Napaka', 'Strežnik trenutno ni dosegljiv.');
        speak('Strežnik trenutno ni dosegljiv.');
    }
}

async function loadWorkouts() {
    const search = searchInput.value.trim();

    if (!accessToken) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/workouts?search=${encodeURIComponent(search)}`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        const data = await response.json();

        if (!response.ok) {
            showNotification('Napaka', data.message || 'Podatkov ni bilo mogoče pridobiti.');
            return;
        }

        localStorage.setItem('workouts', JSON.stringify(data));
        renderWorkouts(data);

    } catch (error) {
        const localData = JSON.parse(localStorage.getItem('workouts')) || [];
        renderWorkouts(localData);
        showNotification('Offline način', 'Prikazani so lokalno shranjeni podatki.');
        speak('Prikazani so lokalno shranjeni podatki.');
    }
}

function renderWorkouts(workouts) {
    workoutsContainer.innerHTML = '';

    if (workouts.length === 0) {
        workoutsContainer.innerHTML = '<p>Ni najdenih treningov.</p>';
        return;
    }

    workouts.forEach(workout => {
        const card = document.createElement('div');
        card.className = 'workout-card';

        const imagePath = workout.id === 2 ? '/images/workout2.png' : '/images/workout1.png';

        card.innerHTML = `
            <img data-src="${imagePath}" alt="Slika treninga" class="lazy-image">
            <h3>${workout.title}</h3>
            <p><strong>Vrsta:</strong> ${workout.type}</p>
            <p><strong>Trajanje:</strong> ${workout.duration} min</p>
            <p><strong>Kalorije:</strong> ${workout.calories}</p>
            <div class="actions">
                <button class="edit-btn" onclick="editWorkout(${workout.id})">Uredi</button>
                <button class="delete-btn" onclick="deleteWorkout(${workout.id})">Izbriši</button>
            </div>
        `;

        workoutsContainer.appendChild(card);
    });

    lazyLoadImages();
}

async function addWorkout() {
    const workout = {
        title: document.getElementById('title').value,
        type: document.getElementById('type').value,
        duration: Number(document.getElementById('duration').value),
        calories: Number(document.getElementById('calories').value)
    };

    if (!workout.title || !workout.type || !workout.duration) {
        showNotification('Napaka', 'Vnesite naslov, vrsto in trajanje treninga.');
        return;
    }

    if (!navigator.onLine) {
        saveOfflineWorkout(workout);
        showNotification('Offline način', 'Trening je shranjen lokalno in bo sinhroniziran pozneje.');
        clearForm();
        return;
    }

    try {
        const response = await fetch(`${API_URL}/workouts`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify(workout)
        });

        const data = await response.json();

        if (!response.ok) {
            showNotification('Napaka', data.message || 'Treninga ni bilo mogoče dodati.');
            speak('Treninga ni bilo mogoče dodati.');
            return;
        }

        showNotification('Uspeh', 'Trening je bil uspešno dodan.');
        speak('Trening je bil uspešno dodan.');
        clearForm();
        loadWorkouts();

    } catch (error) {
        saveOfflineWorkout(workout);
        showNotification('Offline način', 'Trening je shranjen lokalno in bo sinhroniziran pozneje.');
        speak('Trening je shranjen lokalno.');
        clearForm();
    }
}

async function editWorkout(id) {
    const newTitle = prompt('Vnesite nov naslov treninga:');

    if (!newTitle) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/workouts/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify({
                title: newTitle
            })
        });

        const data = await response.json();

        if (!response.ok) {
            showNotification('Napaka', data.message || 'Treninga ni bilo mogoče posodobiti.');
            speak('Treninga ni bilo mogoče posodobiti.');
            return;
        }

        showNotification('Uspeh', 'Trening je bil uspešno posodobljen.');
        speak('Trening je bil uspešno posodobljen.');
        loadWorkouts();

    } catch (error) {
        showNotification('Napaka', 'Posodobitev ni uspela.');
        speak('Posodobitev ni uspela.');
    }
}

async function deleteWorkout(id) {
    if (!confirm('Ali res želite izbrisati trening?')) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/workouts/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        const data = await response.json();

        if (!response.ok) {
            showNotification('Napaka', data.message || 'Treninga ni bilo mogoče izbrisati.');
            speak('Treninga ni bilo mogoče izbrisati.');
            return;
        }

        showNotification('Uspeh', 'Trening je bil uspešno izbrisan.');
        speak('Trening je bil uspešno izbrisan.');
        loadWorkouts();

    } catch (error) {
        showNotification('Napaka', 'Brisanje ni uspelo.');
        speak('Brisanje ni uspelo.');
    }
}

function clearForm() {
    document.getElementById('title').value = '';
    document.getElementById('type').value = '';
    document.getElementById('duration').value = '';
    document.getElementById('calories').value = '';
}

function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission !== 'granted') {
        Notification.requestPermission();
    }
}

function showNotification(title, body) {
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, {
            body,
            icon: '/icons/icon-192.png'
        });
    } else {
        console.log(`${title}: ${body}`);
    }
}

function saveOfflineWorkout(workout) {
    const offlineWorkouts = JSON.parse(localStorage.getItem('offlineWorkouts')) || [];
    offlineWorkouts.push(workout);
    localStorage.setItem('offlineWorkouts', JSON.stringify(offlineWorkouts));
}

async function syncOfflineWorkouts() {
    const offlineWorkouts = JSON.parse(localStorage.getItem('offlineWorkouts')) || [];

    if (offlineWorkouts.length === 0 || !accessToken) {
        return;
    }

    for (const workout of offlineWorkouts) {
        await fetch(`${API_URL}/workouts`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify(workout)
        });
    }

    localStorage.removeItem('offlineWorkouts');
    showNotification('Sinhronizacija', 'Lokalni podatki so bili uspešno sinhronizirani.');
    speak('Lokalni podatki so bili sinhronizirani.');
    loadWorkouts();
}

function lazyLoadImages() {
    const images = document.querySelectorAll('.lazy-image');

    if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver((entries, imageObserver) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const image = entry.target;
                    image.src = image.dataset.src;
                    image.classList.remove('lazy-image');
                    imageObserver.unobserve(image);
                }
            });
        });

        images.forEach(image => observer.observe(image));
    } else {
        images.forEach(image => {
            image.src = image.dataset.src;
            image.classList.remove('lazy-image');
        });
    }
}

function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/service-worker.js')
            .then(() => console.log('Service worker registriran.'))
            .catch(error => console.log('Napaka pri registraciji service workerja:', error));
    }
}