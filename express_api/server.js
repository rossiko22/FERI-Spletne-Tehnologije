const express = require('express');
const app = express();

app.use(express.json());

// =====================
// TEST ROUTE
// =====================
app.get('/', (req, res) => {
    res.send('Fitness Buddy API deluje');
});

// =====================
// PODATKOVNI MODEL API
// =====================

// =====================
// WORKOUTS
// =====================
let workouts = [];

app.get('/workouts', (req, res) => {
    res.json(workouts);
});

app.post('/workouts', (req, res) => {
    workouts.push(req.body);
    res.json(req.body);
});

app.put('/workouts/:id', (req, res) => {
    const id = req.params.id;
    workouts[id] = req.body;
    res.json(workouts[id]);
});

app.delete('/workouts/:id', (req, res) => {
    const id = req.params.id;
    workouts.splice(id, 1);
    res.send('Workout deleted');
});


// =====================
// HABITS
// =====================
let habits = [];

app.get('/habits', (req, res) => {
    res.json(habits);
});

app.post('/habits', (req, res) => {
    habits.push(req.body);
    res.json(req.body);
});

app.put('/habits/:id', (req, res) => {
    const id = req.params.id;
    habits[id] = req.body;
    res.json(habits[id]);
});

app.delete('/habits/:id', (req, res) => {
    const id = req.params.id;
    habits.splice(id, 1);
    res.send('Habit deleted');
});


// =====================
// HABIT LOGS
// =====================
let habitlogs = [];

app.get('/habitlogs', (req, res) => {
    res.json(habitlogs);
});

app.post('/habitlogs', (req, res) => {
    habitlogs.push(req.body);
    res.json(req.body);
});

app.put('/habitlogs/:id', (req, res) => {
    const id = req.params.id;
    habitlogs[id] = req.body;
    res.json(habitlogs[id]);
});

app.delete('/habitlogs/:id', (req, res) => {
    const id = req.params.id;
    habitlogs.splice(id, 1);
    res.send('Habit log deleted');
});


// =====================
// MEALS
// =====================
let meals = [];

app.get('/meals', (req, res) => {
    res.json(meals);
});

app.post('/meals', (req, res) => {
    meals.push(req.body);
    res.json(req.body);
});

app.put('/meals/:id', (req, res) => {
    const id = req.params.id;
    meals[id] = req.body;
    res.json(meals[id]);
});

app.delete('/meals/:id', (req, res) => {
    const id = req.params.id;
    meals.splice(id, 1);
    res.send('Meal deleted');
});


// =====================
// STREZNIK API 
// =====================

// =====================
// ODJEMALEC API 
// =====================


app.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
});