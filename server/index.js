require('dotenv').config();

const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');

const REQUIRED_ENV = ['JWT_SECRET', 'ADMIN_USERNAME', 'ADMIN_PASSWORD_HASH'];
const missing = REQUIRED_ENV.filter((key) => !process.env[key]);
if (missing.length) {
  console.error(
    `Variables d'environnement manquantes : ${missing.join(', ')}.\n` +
      `Copiez .env.example vers .env et complétez-le (voir README.md).`
  );
  process.exit(1);
}

const offersRoute = require('./routes/offers');
const contactRoute = require('./routes/contact');
const ordersRoute = require('./routes/orders');
const adminRoute = require('./routes/admin');

const app = express();

app.disable('x-powered-by');
app.use(helmet({ contentSecurityPolicy: false })); // CSP disabled: page loads Google Fonts; see README to harden further
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use('/api/offers', offersRoute);
app.use('/api/contact', contactRoute);
app.use('/api/orders', ordersRoute);
app.use('/api/admin', adminRoute);

app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'admin.html'));
});

// Centralized error handler — catches multer errors (bad file type/size) too.
app.use((err, req, res, next) => {
  if (err && err.message && err.message.includes('Format de fichier')) {
    return res.status(400).json({ error: err.message });
  }
  if (err && err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'Fichier trop volumineux (5 Mo maximum).' });
  }
  console.error(err);
  res.status(500).json({ error: 'Erreur serveur.' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Momo Tech en écoute sur http://localhost:${PORT}`);
});
