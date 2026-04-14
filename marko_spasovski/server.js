import express from 'express';
import jwt from 'jsonwebtoken';
import './db/initDb.js';
import usersRouter from './routes/users.js';
import workoutsRouter from './routes/workouts.js';
import habitsRouter from './routes/habits.js';
import habitlogsRouter from './routes/habitlogs.js';
import mealsRouter from './routes/meals.js';

const app = express();
const PORT = 3001;

app.use(express.json());

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

// protect API routes
app.use('/api', verifyToken);

// mount routers
app.use('/api/users', usersRouter);
app.use('/api/workouts', workoutsRouter);
app.use('/api/habits', habitsRouter);
app.use('/api/habitlogs', habitlogsRouter);
app.use('/api/meals', mealsRouter);

app.listen(PORT, () => {
    console.log(`Server running: http://localhost:${PORT}`);
});