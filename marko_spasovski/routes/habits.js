import express from 'express';
import db from '../db/db.js';
const router = express.Router();

router.get('/', (req, res) => res.json(db.prepare('SELECT * FROM habits').all()));
router.get('/:id', (req, res) => {
    const h = db.prepare('SELECT * FROM habits WHERE id = ?').get(req.params.id);
    if (!h) return res.status(404).json({ napaka: 'Navada ne obstaja' });
    res.json(h);
});
router.post('/', (req, res) => {
    const { user_id, naziv, cilj } = req.body;
    if (!user_id || !naziv || !cilj) return res.status(400).json({ napaka: 'Polja user_id, naziv in cilj so obvezna' });
    const result = db.prepare('INSERT INTO habits (user_id, naziv, cilj) VALUES (?, ?, ?)')
        .run(user_id, naziv, cilj);
    res.status(201).json(db.prepare('SELECT * FROM habits WHERE id = ?').get(result.lastInsertRowid));
});
router.put('/:id', (req, res) => {
    const h = db.prepare('SELECT * FROM habits WHERE id = ?').get(req.params.id);
    if (!h) return res.status(404).json({ napaka: 'Navada ne obstaja' });
    const { user_id, naziv, cilj } = { ...h, ...req.body };
    db.prepare('UPDATE habits SET user_id = ?, naziv = ?, cilj = ? WHERE id = ?')
        .run(user_id, naziv, cilj, req.params.id);
    res.json(db.prepare('SELECT * FROM habits WHERE id = ?').get(req.params.id));
});
router.delete('/:id', (req, res) => {
    const h = db.prepare('SELECT * FROM habits WHERE id = ?').get(req.params.id);
    if (!h) return res.status(404).json({ napaka: 'Navada ne obstaja' });
    db.prepare('DELETE FROM habits WHERE id = ?').run(req.params.id);
    res.json({ sporocilo: 'Navada izbrisana', deleted: h });
});

export default router;