import express from 'express';
import db from '../db/db.js';

const router = express.Router();

// GET all workouts
router.get('/', (req, res) => res.json(db.prepare('SELECT * FROM workouts').all()));

// GET single workout
router.get('/:id', (req, res) => {
    const w = db.prepare('SELECT * FROM workouts WHERE id = ?').get(req.params.id);
    if (!w) return res.status(404).json({ napaka: 'Trening ne obstaja' });
    res.json(w);
});

// POST new workout
router.post('/', (req, res) => {
    const { user_id, datum, trajanje, tip_treninga } = req.body;
    if (!user_id || !datum || !trajanje || !tip_treninga)
        return res.status(400).json({ napaka: 'Polja user_id, datum, trajanje in tip_treninga so obvezna' });
    const result = db.prepare(
        'INSERT INTO workouts (user_id, datum, trajanje, tip_treninga) VALUES (?, ?, ?, ?)'
    ).run(user_id, datum, trajanje, tip_treninga);
    res.status(201).json(db.prepare('SELECT * FROM workouts WHERE id = ?').get(result.lastInsertRowid));
});

// PUT update
router.put('/:id', (req, res) => {
    const w = db.prepare('SELECT * FROM workouts WHERE id = ?').get(req.params.id);
    if (!w) return res.status(404).json({ napaka: 'Trening ne obstaja' });
    const { user_id, datum, trajanje, tip_treninga } = { ...w, ...req.body };
    db.prepare('UPDATE workouts SET user_id = ?, datum = ?, trajanje = ?, tip_treninga = ? WHERE id = ?')
      .run(user_id, datum, trajanje, tip_treninga, req.params.id);
    res.json(db.prepare('SELECT * FROM workouts WHERE id = ?').get(req.params.id));
});

// DELETE
router.delete('/:id', (req, res) => {
    const w = db.prepare('SELECT * FROM workouts WHERE id = ?').get(req.params.id);
    if (!w) return res.status(404).json({ napaka: 'Trening ne obstaja' });
    db.prepare('DELETE FROM workouts WHERE id = ?').run(req.params.id);
    res.json({ sporocilo: 'Trening izbrisan', deleted: w });
});

export default router;