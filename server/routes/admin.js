const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');

const db = require('../db');
const { requireAdmin } = require('../middleware/auth');

const ALLOWED_STATUS = ['En attente', 'Payée', 'Traitée', 'Annulée'];

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de tentatives de connexion. Réessayez dans quelques minutes.' },
});

router.post('/login', loginLimiter, (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'Identifiant et mot de passe requis.' });
  }

  const validUsername = username === process.env.ADMIN_USERNAME;
  const hash = process.env.ADMIN_PASSWORD_HASH;

  // Always run bcrypt.compareSync (even with a dummy hash) so that an
  // invalid username doesn't respond measurably faster than a wrong password.
  const passwordOk = bcrypt.compareSync(password, hash || bcrypt.hashSync('placeholder', 4));

  if (!validUsername || !hash || !passwordOk) {
    return res.status(401).json({ error: 'Identifiants invalides.' });
  }

  const token = jwt.sign({ username }, process.env.JWT_SECRET, { expiresIn: '12h' });
  res.cookie('momo_admin_token', token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 12 * 60 * 60 * 1000,
  });
  res.json({ ok: true });
});

router.post('/logout', (req, res) => {
  res.clearCookie('momo_admin_token');
  res.json({ ok: true });
});

router.get('/session', requireAdmin, (req, res) => {
  res.json({ ok: true, username: req.admin.username });
});

router.get('/orders', requireAdmin, (req, res) => {
  const { status, q } = req.query;
  let query = 'SELECT * FROM orders';
  const clauses = [];
  const params = [];

  if (status && status !== 'all') {
    clauses.push('status = ?');
    params.push(status);
  }
  if (q) {
    clauses.push('(uid LIKE ? OR whatsapp LIKE ? OR transaction_ref LIKE ? OR player_name LIKE ?)');
    const like = `%${q}%`;
    params.push(like, like, like, like);
  }
  if (clauses.length) query += ' WHERE ' + clauses.join(' AND ');
  query += ' ORDER BY created_at DESC';

  res.json(db.prepare(query).all(...params));
});

router.get('/orders/:id/proof', requireAdmin, (req, res) => {
  const row = db.prepare('SELECT proof_filename FROM orders WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Commande introuvable.' });

  const filePath = path.join(__dirname, '..', '..', 'uploads', row.proof_filename);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Fichier introuvable.' });

  res.sendFile(filePath);
});

router.patch('/orders/:id', requireAdmin, (req, res) => {
  const existing = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Commande introuvable.' });

  const { status, internal_note } = req.body || {};
  const newStatus = status && ALLOWED_STATUS.includes(status) ? status : existing.status;
  const newNote = typeof internal_note === 'string' ? internal_note.slice(0, 2000) : existing.internal_note;

  db.prepare(`UPDATE orders SET status = ?, internal_note = ?, updated_at = datetime('now') WHERE id = ?`).run(
    newStatus,
    newNote,
    req.params.id
  );

  res.json({ ok: true });
});
router.delete('/orders/:id', requireAdmin, (req, res) => {
  const existing = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);

  if (!existing) {
    return res.status(404).json({ error: 'Commande introuvable.' });
  }

  if (existing.status !== 'Annulée') {
    return res.status(400).json({ error: 'Seules les commandes annulées peuvent être supprimées.' });
  }

  if (existing.proof_filename) {
    const filePath = path.join(__dirname, '..', '..', 'uploads', existing.proof_filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }

  db.prepare('DELETE FROM orders WHERE id = ?').run(req.params.id);

  res.json({ ok: true });
});

module.exports = router;
