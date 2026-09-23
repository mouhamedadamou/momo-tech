const fs = require('fs');
const path = require('path');

const pricingData = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'data', 'pricing.json'), 'utf-8')
);

function getAllOffers() {
  return [
    ...pricingData.diamonds.map((o) => ({ ...o, category: 'diamonds' })),
    ...pricingData.subscriptions.map((o) => ({ ...o, category: 'subscriptions' })),
  ];
}

// Always look the price up server-side by offer id — never trust a price
// submitted by the client. This is what protects the order total from tampering.
function findOffer(offerId) {
  return getAllOffers().find((o) => o.id === offerId) || null;
}

module.exports = { pricingData, getAllOffers, findOffer };
