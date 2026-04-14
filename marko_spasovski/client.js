import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TOKEN_FILE = path.join(__dirname, 'token.json');

const BASE_URL = 'http://localhost:3001';

// OAuth 2.0 client credentials
const CLIENT_ID = 'fitness_client';
const CLIENT_SECRET = 'tajni_kljuc_fitness';

let TOKEN = null;

// Load token from disk if still valid
function loadToken() {
    try {
        const saved = JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf8'));
        const expiresAt = saved.pridobljen_ob + saved.expires_in * 1000;
        if (Date.now() < expiresAt - 5000) {   // 5 s safety margin
            TOKEN = saved.access_token;
            console.log('✅ Loaded cached token:', TOKEN.substring(0, 20) + '...');
            return true;
        }
        console.log('ℹ️  Cached token expired, fetching new one...');
    } catch {
        // no file or invalid JSON — fetch fresh token
    }
    return false;
}

// Save token to disk
function saveToken(data) {
    const record = { ...data, pridobljen_ob: Date.now() };
    fs.writeFileSync(TOKEN_FILE, JSON.stringify(record, null, 2));
}

// 1️⃣ Get OAuth token (uses cache when still valid)
async function getToken() {
    if (loadToken()) return;

    const res = await fetch(`${BASE_URL}/oauth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            grant_type: 'client_credentials',
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET
        })
    });
    const data = await res.json();
    if (data.access_token) {
        TOKEN = data.access_token;
        saveToken(data);
        console.log('✅ Token acquired and saved:', TOKEN.substring(0, 20) + '...');
    } else {
        console.error('❌ Failed to get token:', data);
    }
}

// Helper for authenticated requests
async function api(path, options = {}) {
    if (!TOKEN) throw new Error('Token not acquired');
    const res = await fetch(`${BASE_URL}${path}`, {
        ...options,
        headers: {
            ...options.headers,
            Authorization: `Bearer ${TOKEN}`,
            'Content-Type': 'application/json'
        }
    });
    const data = await res.json();
    return data;
}

// 2️⃣ Test all routes
async function testAll() {
    try {
        await getToken();

        console.log('\n--- USERS ---');
        let users = await api('/api/users');
        console.log('All users:', users);

        let newUser = await api('/api/users', {
            method: 'POST',
            body: JSON.stringify({ ime: 'Marko', email: 'marko@test.com', geslo: '1234' })
        });
        console.log('Created user:', newUser);

        let userId = newUser.id;
        await api(`/api/users/${userId}`, {
            method: 'PUT',
            body: JSON.stringify({ ime: 'Marko Updated' })
        });
        console.log('Updated user:', await api(`/api/users/${userId}`));

        await api(`/api/users/${userId}`, { method: 'DELETE' });
        console.log('Deleted user', userId);

        console.log('\n--- WORKOUTS ---');
        let workouts = await api('/api/workouts');
        console.log('All workouts:', workouts);

        let newWorkout = await api('/api/workouts', {
            method: 'POST',
            body: JSON.stringify({ user_id: 1, datum: '2026-04-08', trajanje: 60, tip_treninga: 'Cardio' })
        });
        console.log('Created workout:', newWorkout);

        let workoutId = newWorkout.id;
        await api(`/api/workouts/${workoutId}`, {
            method: 'PUT',
            body: JSON.stringify({ trajanje: 90 })
        });
        console.log('Updated workout:', await api(`/api/workouts/${workoutId}`));

        await api(`/api/workouts/${workoutId}`, { method: 'DELETE' });
        console.log('Deleted workout', workoutId);

        console.log('\n--- HABITS ---');
        let habits = await api('/api/habits');
        console.log('All habits:', habits);

        let newHabit = await api('/api/habits', {
            method: 'POST',
            body: JSON.stringify({ user_id: 1, naziv: 'Drink Water', cilj: '8 glasses/day' })
        });
        console.log('Created habit:', newHabit);

        let habitId = newHabit.id;
        await api(`/api/habits/${habitId}`, {
            method: 'PUT',
            body: JSON.stringify({ cilj: '10 glasses/day' })
        });
        console.log('Updated habit:', await api(`/api/habits/${habitId}`));

        await api(`/api/habits/${habitId}`, { method: 'DELETE' });
        console.log('Deleted habit', habitId);

        console.log('\n--- HABIT LOGS ---');
        let logs = await api('/api/habitlogs');
        console.log('All habit logs:', logs);

        let newLog = await api('/api/habitlogs', {
            method: 'POST',
            body: JSON.stringify({ habit_id: 1, datum: '2026-04-08', vrednost: 8 })
        });
        console.log('Created habit log:', newLog);

        let logId = newLog.id;
        await api(`/api/habitlogs/${logId}`, {
            method: 'PUT',
            body: JSON.stringify({ vrednost: 9 })
        });
        console.log('Updated habit log:', await api(`/api/habitlogs/${logId}`));

        await api(`/api/habitlogs/${logId}`, { method: 'DELETE' });
        console.log('Deleted habit log', logId);

        console.log('\n--- MEALS ---');
        let meals = await api('/api/meals');
        console.log('All meals:', meals);

        let newMeal = await api('/api/meals', {
            method: 'POST',
            body: JSON.stringify({ user_id: 1, naziv_obroka: 'Breakfast', cas: '08:00', kalorije: 350 })
        });
        console.log('Created meal:', newMeal);

        let mealId = newMeal.id;
        await api(`/api/meals/${mealId}`, {
            method: 'PUT',
            body: JSON.stringify({ kalorije: 400 })
        });
        console.log('Updated meal:', await api(`/api/meals/${mealId}`));

        await api(`/api/meals/${mealId}`, { method: 'DELETE' });
        console.log('Deleted meal', mealId);

        console.log('\n✅ All API routes tested successfully!');
    } catch (err) {
        console.error('Error testing API:', err);
    }
}

// Run tests
testAll();