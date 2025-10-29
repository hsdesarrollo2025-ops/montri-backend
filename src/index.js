console.log('🔐 JWT_SECRET activo:', process.env.JWT_SECRET || 'NO DEFINIDO');
const jwt = require('jsonwebtoken');
try {
  const testToken = jwt.sign({ test: 'ok' }, process.env.JWT_SECRET || 'NO_SECRET', { expiresIn: '1h' });
  console.log('🔍 TEST TOKEN:', testToken);
  console.log('✅ JWT_SECRET en uso:', process.env.JWT_SECRET || 'NO DEFINIDO');
} catch (e) {
  console.log('⚠️ No se pudo firmar TEST TOKEN:', e?.message || e);
}
const seedTaxCategories = require('./api/tax-category/content-types/tax-category/seed-tax-categories');

module.exports = {
  register() {},

  async bootstrap({ strapi }) {
    try {
      await seedTaxCategories({ strapi });
    } catch (err) {
      strapi.log.error('Error ejecutando seed tax-categories:', err);
    }
  },
};
