console.log('✅ JWT_SECRET en uso:', process.env.JWT_SECRET);
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
