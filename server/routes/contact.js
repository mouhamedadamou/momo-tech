const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

const contact = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'data', 'contact.json'), 'utf-8')
);

router.get('/', (req, res) => {
  res.json(contact);
});

module.exports = router;
