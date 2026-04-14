const express = require('express');
const crypto = require('crypto');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// =====================
// OAuth 2.0 - demo podatki
// =====================
const CLIENT_ID = 'fitness-client';
const CLIENT_SECRET = 'super-secret-client-key';

const issuedTokens = new Map(); // token -> { clientId, expiresAt }

// =====================
// Helper funkcije
// =====================
function generateAccessToken() {
    return crypto.randomBytes(32).toString('hex');
}

function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            error: 'invalid_token',
            error_description: 'Manjka Bearer access token.'
        });
    }

    const token = authHeader.split(' ')[1];
    const tokenData = issuedTokens.get(token);

    if (!tokenData) {
        return res.status(401).json({
            error: 'invalid_token',
            error_description: 'Žeton ni veljaven.'
        });
    }

    if (Date.now() > tokenData.expiresAt) {
        issuedTokens.delete(token);
        return res.status(401).json({
            error: 'invalid_token',
            error_description: 'Žeton je potekel.'
        });
    }

    req.client = { clientId: tokenData.clientId };
    next();
}

// =====================
// OAuth 2.0 token endpoint
// =====================
app.post('/oauth/token', (req, res) => {
    const { grant_type, client_id, client_secret } = req.body;

    if (grant_type !== 'client_credentials') {
        return res.status(400).json({
            error: 'unsupported_grant_type',
            error_description: 'Podprt je samo client_credentials.'
        });
    }

    if (client_id !== CLIENT_ID || client_secret !== CLIENT_SECRET) {
        return res.status(401).json({
            error: 'invalid_client',
            error_description: 'Napačen client_id ali client_secret.'
        });
    }

    const accessToken = generateAccessToken();
    const expiresIn = 3600; // 1 ura

    issuedTokens.set(accessToken, {
        clientId: client_id,
        expiresAt: Date.now() + expiresIn * 1000
    });

    res.json({
        access_token: accessToken,
        token_type: 'Bearer',
        expires_in: expiresIn
    });
});

// =====================
// TEST ROUTE
// =====================
app.get('/', (req, res) => {
    res.send('Fitness Buddy API deluje');
});

// =====================
// ZAŠČITENE POTI - ČLAN 2
// =====================

let workouts = [];
let habits = [];
let habitlogs = [];
let meals = [];

// WORKOUTS
app.get('/workouts', authMiddleware, (req, res) => {
    res.json(workouts);
});

app.post('/workouts', authMiddleware, (req, res) => {
    workouts.push(req.body);
    res.status(201).json(req.body);
});

app.put('/workouts/:id', authMiddleware, (req, res) => {
    const id = Number(req.params.id);

    if (!workouts[id]) {
        return res.status(404).json({ error: 'Workout not found' });
    }

    workouts[id] = req.body;
    res.json(workouts[id]);
});

app.delete('/workouts/:id', authMiddleware, (req, res) => {
    const id = Number(req.params.id);

    if (!workouts[id]) {
        return res.status(404).json({ error: 'Workout not found' });
    }

    workouts.splice(id, 1);
    res.status(204).send();
});

// HABITS
app.get('/habits', authMiddleware, (req, res) => {
    res.json(habits);
});

app.post('/habits', authMiddleware, (req, res) => {
    habits.push(req.body);
    res.status(201).json(req.body);
});

app.put('/habits/:id', authMiddleware, (req, res) => {
    const id = Number(req.params.id);

    if (!habits[id]) {
        return res.status(404).json({ error: 'Habit not found' });
    }

    habits[id] = req.body;
    res.json(habits[id]);
});

app.delete('/habits/:id', authMiddleware, (req, res) => {
    const id = Number(req.params.id);

    if (!habits[id]) {
        return res.status(404).json({ error: 'Habit not found' });
    }

    habits.splice(id, 1);
    res.status(204).send();
});

// HABIT LOGS
app.get('/habitlogs', authMiddleware, (req, res) => {
    res.json(habitlogs);
});

app.post('/habitlogs', authMiddleware, (req, res) => {
    habitlogs.push(req.body);
    res.status(201).json(req.body);
});

app.put('/habitlogs/:id', authMiddleware, (req, res) => {
    const id = Number(req.params.id);

    if (!habitlogs[id]) {
        return res.status(404).json({ error: 'Habit log not found' });
    }

    habitlogs[id] = req.body;
    res.json(habitlogs[id]);
});

app.delete('/habitlogs/:id', authMiddleware, (req, res) => {
    const id = Number(req.params.id);

    if (!habitlogs[id]) {
        return res.status(404).json({ error: 'Habit log not found' });
    }

    habitlogs.splice(id, 1);
    res.status(204).send();
});

// MEALS
app.get('/meals', authMiddleware, (req, res) => {
    res.json(meals);
});

app.post('/meals', authMiddleware, (req, res) => {
    meals.push(req.body);
    res.status(201).json(req.body);
});

app.put('/meals/:id', authMiddleware, (req, res) => {
    const id = Number(req.params.id);

    if (!meals[id]) {
        return res.status(404).json({ error: 'Meal not found' });
    }

    meals[id] = req.body;
    res.json(meals[id]);
});

app.delete('/meals/:id', authMiddleware, (req, res) => {
    const id = Number(req.params.id);

    if (!meals[id]) {
        return res.status(404).json({ error: 'Meal not found' });
    }

    meals.splice(id, 1);
    res.status(204).send();
});

app.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
});