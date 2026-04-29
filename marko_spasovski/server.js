import express from 'express';
import jwt from 'jsonwebtoken';
import webpush from 'web-push';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import './db/initDb.js';
import usersRouter from './routes/users.js';
import workoutsRouter from './routes/workouts.js';
import habitsRouter from './routes/habits.js';
import habitlogsRouter from './routes/habitlogs.js';
import mealsRouter from './routes/meals.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

app.use(express.json());

// CORS
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.sendStatus(200);
    next();
});

// Serve PWA static files
app.use(express.static(path.join(__dirname, 'public')));

// VAPID key management
let vapidKeys;
const vapidKeysPath = path.join(__dirname, 'vapid-keys.json');
if (fs.existsSync(vapidKeysPath)) {
    vapidKeys = JSON.parse(fs.readFileSync(vapidKeysPath, 'utf8'));
} else {
    vapidKeys = webpush.generateVAPIDKeys();
    fs.writeFileSync(vapidKeysPath, JSON.stringify(vapidKeys));
    console.log('Generated VAPID keys');
}

webpush.setVapidDetails(
    'mailto:marko.spasovski1@student.um.si',
    vapidKeys.publicKey,
    vapidKeys.privateKey
);

// In-memory push subscriptions store
const pushSubscriptions = new Map();

// JWT setup
const JWT_SECRET = 'fitness_buddy_jwt_tajni_kljuc_2024';
const TOKEN_EXPIRES_IN = 3600;
const OAUTH_CLIENTS = {
    fitness_client: { client_secret: 'tajni_kljuc_fitness', scope: 'read write' },
    admin_client: { client_secret: 'tajni_kljuc_admin', scope: 'read write delete' }
};

app.post('/oauth/token', (req, res) => {
    const { grant_type, client_id, client_secret } = req.body;
    if (grant_type !== 'client_credentials') return res.status(400).json({ error: 'unsupported_grant_type' });
    const client = OAUTH_CLIENTS[client_id];
    if (!client || client.client_secret !== client_secret) return res.status(401).json({ error: 'invalid_client' });

    const token = jwt.sign({ sub: client_id, scope: client.scope }, JWT_SECRET, { expiresIn: TOKEN_EXPIRES_IN });
    res.json({ access_token: token, token_type: 'Bearer', expires_in: TOKEN_EXPIRES_IN, scope: client.scope });
});

// JWT verification middleware
function verifyToken(req, res, next) {
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'unauthorized' });
    try { req.client = jwt.verify(auth.split(' ')[1], JWT_SECRET); next(); }
    catch { return res.status(401).json({ error: 'invalid_token' }); }
}

// Push notification endpoints (defined before global /api auth)
app.get('/api/push/vapid-public-key', (req, res) => {
    res.json({ publicKey: vapidKeys.publicKey });
});

app.post('/api/push/subscribe', verifyToken, (req, res) => {
    const subscription = req.body;
    if (!subscription?.endpoint) return res.status(400).json({ error: 'Invalid subscription' });
    pushSubscriptions.set(subscription.endpoint, subscription);
    res.status(201).json({ message: 'Subscribed successfully' });
});

app.delete('/api/push/unsubscribe', verifyToken, (req, res) => {
    const { endpoint } = req.body;
    pushSubscriptions.delete(endpoint);
    res.json({ message: 'Unsubscribed' });
});

app.post('/api/push/send', verifyToken, async (req, res) => {
    const { title, body, url } = req.body;
    const payload = JSON.stringify({ title: title || 'FitnessBuddy', body: body || 'Novo obvestilo', url });
    const sends = [];
    for (const [endpoint, sub] of pushSubscriptions) {
        sends.push(
            webpush.sendNotification(sub, payload).catch(err => {
                if (err.statusCode === 410 || err.statusCode === 404) pushSubscriptions.delete(endpoint);
            })
        );
    }
    await Promise.all(sends);
    res.json({ sent: pushSubscriptions.size, total_subscribers: pushSubscriptions.size });
});

app.get('/api/push/subscribers', verifyToken, (req, res) => {
    res.json({ count: pushSubscriptions.size });
});

// Protect all remaining /api routes
app.use('/api', verifyToken);

// Mount routers
app.use('/api/users', usersRouter);
app.use('/api/workouts', workoutsRouter);
app.use('/api/habits', habitsRouter);
app.use('/api/habitlogs', habitlogsRouter);
app.use('/api/meals', mealsRouter);

app.listen(PORT, () => {
    console.log(`Server running: http://localhost:${PORT}`);
    console.log(`PWA available at: http://localhost:${PORT}`);
});
