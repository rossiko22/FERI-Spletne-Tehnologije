import express from 'express';
import db from '../db/db.js';

const router = express.Router();

// GET all users
router.get('/', (req, res) => {
    res.json(db.prepare('SELECT * FROM users').all());
});

// GET single user
router.get('/:id', (req, res) => {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
    if (!user) return res.status(404).json({ napaka: 'Uporabnik ne obstaja' });
    res.json(user);
});

// POST new user
router.post('/', (req, res) => {
    const { ime, email, geslo } = req.body;
    if (!ime || !email || !geslo) return res.status(400).json({ napaka: 'Polja ime, email in geslo so obvezna' });
    const datum_registracije = new Date().toISOString().split('T')[0];
    const result = db.prepare(
        'INSERT INTO users (ime, email, geslo, datum_registracije) VALUES (?, ?, ?, ?)'
    ).run(ime, email, geslo, datum_registracije);
    res.status(201).json(db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid));
});

// PUT update user
router.put('/:id', (req, res) => {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
    if (!user) return res.status(404).json({ napaka: 'Uporabnik ne obstaja' });
    const { ime, email, geslo } = { ...user, ...req.body };
    db.prepare('UPDATE users SET ime = ?, email = ?, geslo = ? WHERE id = ?')
      .run(ime, email, geslo, req.params.id);
    res.json(db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id));
});

// DELETE user
router.delete('/:id', (req, res) => {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
    if (!user) return res.status(404).json({ napaka: 'Uporabnik ne obstaja' });
    db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
    res.json({ sporocilo: 'Uporabnik izbrisan', deleted: user });
});

export default router;