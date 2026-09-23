#!/usr/bin/env node
// Usage: node server/scripts/hash-password.js "VotreMotDePasse"
const bcrypt = require('bcryptjs');

const password = process.argv[2];
if (!password) {
  console.log('Usage : node server/scripts/hash-password.js "VotreMotDePasse"');
  process.exit(1);
}

const hash = bcrypt.hashSync(password, 12);
console.log('\nAjoutez (ou remplacez) cette ligne dans votre fichier .env :\n');
console.log(`ADMIN_PASSWORD_HASH=${hash}\n`);
