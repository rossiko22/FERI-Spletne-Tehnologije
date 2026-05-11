const express = require('express');
const crypto = require('crypto');
const path = require('path');

const app = express();
const PORT = 3001;

app.use(express.json());

// CORS nastavitev
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }

    next();
});

// Statične datoteke PWA aplikacije
app.use(express.static(path.join(__dirname, 'public')));

// Začasni uporabnik v pomnilniku
const users = [
    {
        id: 1,
        username: 'sladjana',
        password: '12345'
    }
];

// Shranjeni access tokeni
let accessTokens = [];

// Začasni podatki v pomnilniku
let workouts = [
    {
        id: 1,
        title: 'Trening nog',
        type: 'fitness',
        duration: 60,
        calories: 350,
        image: '/images/workout1.svg'
    },
    {
        id: 2,
        title: 'Jutranji tek',
        type: 'cardio',
        duration: 30,
        calories: 220,
        image: '/images/workout2.svg'
    }
];

let nextWorkoutId = 3;

// Shranjene push naročnine
let pushSubscriptions = [];

// Osnovna pot
app.get('/api/status', (req, res) => {
    res.json({
        message: 'REST API strežnik za Fitness Buddy PWA deluje.'
    });
});

// OAuth 2.0 token endpoint
app.post('/oauth/token', (req, res) => {
    const { username, password, grant_type } = req.body;

    if (grant_type !== 'password') {
        return res.status(400).json({
            error: 'unsupported_grant_type',
            message: 'Podprt je samo grant_type password.'
        });
    }

    const user = users.find(
        u => u.username === username && u.password === password
    );

    if (!user) {
        return res.status(401).json({
            error: 'invalid_client',
            message: 'Napačno uporabniško ime ali geslo.'
        });
    }

    const token = crypto.randomBytes(32).toString('hex');

    accessTokens.push({
        token,
        userId: user.id,
        createdAt: new Date()
    });

    res.json({
        access_token: token,
        token_type: 'Bearer',
        expires_in: 3600
    });
});

// Middleware za preverjanje Bearer tokena
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];

    if (!authHeader) {
        return res.status(401).json({
            message: 'Dostop zavrnjen. Manjka avtorizacijski žeton.'
        });
    }

    const parts = authHeader.split(' ');

    if (parts.length !== 2 || parts[0] !== 'Bearer') {
        return res.status(401).json({
            message: 'Neveljavna oblika avtorizacijskega žetona.'
        });
    }

    const token = parts[1];
    const savedToken = accessTokens.find(t => t.token === token);

    if (!savedToken) {
        return res.status(403).json({
            message: 'Neveljaven ali potekel avtorizacijski žeton.'
        });
    }

    req.userId = savedToken.userId;
    next();
}

// GET - pridobi vse treninge
app.get('/workouts', authenticateToken, (req, res) => {
    const search = req.query.search ? req.query.search.toLowerCase() : '';

    if (!search) {
        return res.json(workouts);
    }

    const filteredWorkouts = workouts.filter(workout =>
        workout.title.toLowerCase().includes(search) ||
        workout.type.toLowerCase().includes(search)
    );

    res.json(filteredWorkouts);
});

// GET - pridobi en trening po ID
app.get('/workouts/:id', authenticateToken, (req, res) => {
    const id = parseInt(req.params.id);
    const workout = workouts.find(w => w.id === id);

    if (!workout) {
        return res.status(404).json({ message: 'Trening ni najden.' });
    }

    res.json(workout);
});

// POST - dodaj nov trening
app.post('/workouts', authenticateToken, (req, res) => {
    const { title, type, duration, calories } = req.body;

    if (!title || !type || !duration) {
        return res.status(400).json({
            message: 'Manjkajo obvezni podatki: title, type ali duration.'
        });
    }

    const newWorkout = {
        id: nextWorkoutId++,
        title,
        type,
        duration,
        calories: calories || 0,
        image: '/images/workout1.svg'
    };

    workouts.push(newWorkout);

    res.status(201).json({
        message: 'Trening je bil uspešno dodan.',
        workout: newWorkout
    });
});

// PUT - posodobi obstoječ trening
app.put('/workouts/:id', authenticateToken, (req, res) => {
    const id = parseInt(req.params.id);
    const workout = workouts.find(w => w.id === id);

    if (!workout) {
        return res.status(404).json({ message: 'Trening ni najden.' });
    }

    const { title, type, duration, calories } = req.body;

    workout.title = title || workout.title;
    workout.type = type || workout.type;
    workout.duration = duration || workout.duration;
    workout.calories = calories !== undefined ? calories : workout.calories;

    res.json({
        message: 'Trening je bil uspešno posodobljen.',
        workout
    });
});

// DELETE - izbriši trening
app.delete('/workouts/:id', authenticateToken, (req, res) => {
    const id = parseInt(req.params.id);
    const index = workouts.findIndex(w => w.id === id);

    if (index === -1) {
        return res.status(404).json({ message: 'Trening ni najden.' });
    }

    const deletedWorkout = workouts.splice(index, 1);

    res.json({
        message: 'Trening je bil uspešno izbrisan.',
        workout: deletedWorkout[0]
    });
});

// Endpoint za shranjevanje push naročnine
app.post('/push/subscribe', authenticateToken, (req, res) => {
    const subscription = req.body;

    pushSubscriptions.push(subscription);

    res.status(201).json({
        message: 'Push naročnina je bila uspešno shranjena.'
    });
});

// Testni endpoint za push obvestilo
app.post('/push/send', authenticateToken, (req, res) => {
    const { title, body } = req.body;

    res.json({
        message: 'Testno potisno sporočilo je bilo pripravljeno.',
        notification: {
            title: title || 'Fitness Buddy',
            body: body || 'Novo obvestilo iz strežnika.'
        },
        subscriptionsCount: pushSubscriptions.length
    });
});

app.listen(PORT, () => {
    console.log(`Fitness Buddy PWA strežnik deluje na http://localhost:${PORT}`);
});