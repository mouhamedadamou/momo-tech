const express = require('express');
const router = express.Router();
const { pricingData } = require('../pricing');

router.get('/', (req, res) => {
  res.json(pricingData);
});

module.exports = router;
