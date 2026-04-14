import express from 'express';
import db from '../db/db.js';
const router = express.Router();

router.get('/', (req, res) => res.json(db.prepare('SELECT * FROM meals').all()));
router.get('/:id', (req, res) => {
    const m = db.prepare('SELECT * FROM meals WHERE id = ?').get(req.params.id);
    if (!m) return res.status(404).json({ napaka: 'Obrok ne obstaja' });
    res.json(m);
});
router.post('/', (req, res) => {
    const { user_id, naziv_obroka, cas, kalorije } = req.body;
    if (!user_id || !naziv_obroka || !cas || !kalorije) return res.status(400).json({ napaka: 'Polja user_id, naziv_obroka, cas in kalorije so obvezna' });
    const result = db.prepare('INSERT INTO meals (user_id, naziv_obroka, cas, kalorije) VALUES (?, ?, ?, ?)')
        .run(user_id, naziv_obroka, cas, kalorije);
    res.status(201).json(db.prepare('SELECT * FROM meals WHERE id = ?').get(result.lastInsertRowid));
});
router.put('/:id', (req, res) => {
    const m = db.prepare('SELECT * FROM meals WHERE id = ?').get(req.params.id);
    if (!m) return res.status(404).json({ napaka: 'Obrok ne obstaja' });
    const { user_id, naziv_obroka, cas, kalorije } = { ...m, ...req.body };
    db.prepare('UPDATE meals SET user_id = ?, naziv_obroka = ?, cas = ?, kalorije = ? WHERE id = ?')
        .run(user_id, naziv_obroka, cas, kalorije, req.params.id);
    res.json(db.prepare('SELECT * FROM meals WHERE id = ?').get(req.params.id));
});
router.delete('/:id', (req, res) => {
    const m = db.prepare('SELECT * FROM meals WHERE id = ?').get(req.params.id);
    if (!m) return res.status(404).json({ napaka: 'Obrok ne obstaja' });
    db.prepare('DELETE FROM meals WHERE id = ?').run(req.params.id);
    res.json({ sporocilo: 'Obrok izbrisan', deleted: m });
});

export default router;