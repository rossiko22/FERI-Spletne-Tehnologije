import express from 'express';
import db from '../db/db.js';
const router = express.Router();

router.get('/', (req, res) => res.json(db.prepare('SELECT * FROM habitlogs').all()));
router.get('/:id', (req, res) => {
    const l = db.prepare('SELECT * FROM habitlogs WHERE id = ?').get(req.params.id);
    if (!l) return res.status(404).json({ napaka: 'Evidenca navade ne obstaja' });
    res.json(l);
});
router.post('/', (req, res) => {
    const { habit_id, datum, vrednost } = req.body;
    if (!habit_id || !datum || !vrednost) return res.status(400).json({ napaka: 'Polja habit_id, datum in vrednost so obvezna' });
    const result = db.prepare('INSERT INTO habitlogs (habit_id, datum, vrednost) VALUES (?, ?, ?)')
        .run(habit_id, datum, vrednost);
    res.status(201).json(db.prepare('SELECT * FROM habitlogs WHERE id = ?').get(result.lastInsertRowid));
});
router.put('/:id', (req, res) => {
    const l = db.prepare('SELECT * FROM habitlogs WHERE id = ?').get(req.params.id);
    if (!l) return res.status(404).json({ napaka: 'Evidenca navade ne obstaja' });
    const { habit_id, datum, vrednost } = { ...l, ...req.body };
    db.prepare('UPDATE habitlogs SET habit_id = ?, datum = ?, vrednost = ? WHERE id = ?')
        .run(habit_id, datum, vrednost, req.params.id);
    res.json(db.prepare('SELECT * FROM habitlogs WHERE id = ?').get(req.params.id));
});
router.delete('/:id', (req, res) => {
    const l = db.prepare('SELECT * FROM habitlogs WHERE id = ?').get(req.params.id);
    if (!l) return res.status(404).json({ napaka: 'Evidenca navade ne obstaja' });
    db.prepare('DELETE FROM habitlogs WHERE id = ?').run(req.params.id);
    res.json({ sporocilo: 'Evidenca navade izbrisana', deleted: l });
});

export default router;