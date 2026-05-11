const express = require('express');

const app = express();
const PORT = 3001;

app.use(express.json());

// Začasni podatki v pomnilniku
let workouts = [
    {
        id: 1,
        title: 'Trening nog',
        type: 'fitness',
        duration: 60,
        calories: 350
    }
];

let nextWorkoutId = 2;

// Osnovna pot
app.get('/', (req, res) => {
    res.send('REST API strežnik za Fitness Buddy deluje.');
});

// GET - pridobi vse treninge
app.get('/workouts', (req, res) => {
    res.json(workouts);
});

// GET - pridobi en trening po ID
app.get('/workouts/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const workout = workouts.find(w => w.id === id);

    if (!workout) {
        return res.status(404).json({ message: 'Trening ni najden.' });
    }

    res.json(workout);
});

// POST - dodaj nov trening
app.post('/workouts', (req, res) => {
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
        calories: calories || 0
    };

    workouts.push(newWorkout);

    res.status(201).json({
        message: 'Trening je bil uspešno dodan.',
        workout: newWorkout
    });
});

// PUT - posodobi obstoječ trening
app.put('/workouts/:id', (req, res) => {
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
app.delete('/workouts/:id', (req, res) => {
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

app.listen(PORT, () => {
    console.log(`REST API strežnik deluje na http://localhost:${PORT}`);
});