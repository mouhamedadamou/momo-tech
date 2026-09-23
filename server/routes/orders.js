const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const fs = require('fs');
const path = require('path');

const db = require('../db');
const upload = require('../middleware/upload');
const { findOffer } = require('../pricing');

// Limits abuse of the public order endpoint (per IP).
const orderLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de commandes envoyées depuis cette connexion. Réessayez plus tard.' },
});

// Magic-byte signatures — checked in addition to the declared MIME type,
// since a MIME type header can be spoofed by the client.
const SIGNATURES = {
  '.jpg': [Buffer.from([0xff, 0xd8, 0xff])],
  '.png': [Buffer.from([0x89, 0x50, 0x4e, 0x47])],
  '.pdf': [Buffer.from('%PDF')],
};

function hasValidSignature(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const sigs = SIGNATURES[ext];
  if (!sigs) return false;
  const fd = fs.openSync(filePath, 'r');
  const buf = Buffer.alloc(8);
  fs.readSync(fd, buf, 0, 8, 0);
  fs.closeSync(fd);
  return sigs.some((sig) => buf.slice(0, sig.length).equals(sig));
}

router.post('/', orderLimiter, upload.single('proof'), (req, res) => {
  const cleanupUpload = () => {
    if (req.file) fs.unlink(req.file.path, () => {});
  };

  try {
    const { offerId, uid, playerName, whatsapp, email, paymentMethod, transactionRef } = req.body;

    if (!offerId || !uid || !whatsapp || !paymentMethod || !transactionRef) {
      cleanupUpload();
      return res.status(400).json({ error: 'Merci de remplir tous les champs obligatoires.' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'La preuve de paiement est obligatoire (JPG, PNG ou PDF, 5 Mo max).' });
    }

    const offer = findOffer(offerId);
    if (!offer) {
      cleanupUpload();
      return res.status(400).json({ error: 'Offre invalide.' });
    }

    if (!hasValidSignature(req.file.path)) {
      cleanupUpload();
      return res.status(400).json({ error: "Le fichier envoyé n'est pas une image ou un PDF valide." });
    }

    const uidClean = String(uid).trim();
    const whatsappClean = String(whatsapp).trim();
    const refClean = String(transactionRef).trim();

    if (uidClean.length < 5 || uidClean.length > 20) {
      cleanupUpload();
      return res.status(400).json({ error: 'UID Free Fire invalide.' });
    }
    if (whatsappClean.replace(/\D/g, '').length < 8) {
      cleanupUpload();
      return res.status(400).json({ error: 'Numéro WhatsApp invalide.' });
    }
    if (refClean.length < 3) {
      cleanupUpload();
      return res.status(400).json({ error: 'Référence de transaction invalide.' });
    }

    db.prepare(
      `INSERT INTO orders
        (offer_id, offer_label, offer_category, price, uid, player_name, whatsapp, email, payment_method, transaction_ref, proof_filename, proof_original_name, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'En attente')`
    ).run(
      offer.id,
      offer.label,
      offer.category,
      offer.price, // price is looked up server-side, never taken from the request body
      uidClean,
      playerName ? String(playerName).trim() : null,
      whatsappClean,
      email ? String(email).trim() : null,
      String(paymentMethod).trim(),
      refClean,
      req.file.filename,
      req.file.originalname
    );

    res.json({
      ok: true,
      message:
        'Commande reçue. Votre paiement sera vérifié manuellement. Vous serez contacté sur WhatsApp après validation.',
    });
  } catch (err) {
    cleanupUpload();
    console.error('Order creation error:', err);
    res.status(500).json({ error: 'Une erreur est survenue. Merci de réessayer.' });
  }
});

module.exports = router;
