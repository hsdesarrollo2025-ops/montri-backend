'use strict';

const { createCoreController } = require('@strapi/strapi').factories;
const jwt = require('jsonwebtoken');

module.exports = createCoreController('api::egreso.egreso', ({ strapi }) => ({
  async find(ctx) {
    const authHeader = ctx.request.header.authorization;
    if (!authHeader) return ctx.unauthorized('Falta header Authorization');

    const parts = authHeader.split(' ');
    const token = parts.length === 2 ? parts[1] : authHeader.replace(/^Bearer\s+/i, '').trim();
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'montri-prod-secret-2025');
    } catch (err) {
      console.error('❌ Error verificando JWT:', err.message);
      return ctx.unauthorized('Token inválido o expirado');
    }

    const user = await strapi.db
      .query('plugin::users-permissions.user')
      .findOne({ where: { id: decoded.id } });
    if (!user) return ctx.unauthorized('Usuario no encontrado');
    console.log('✅ Token verificado para usuario:', user.id);

    ctx.query = {
      ...ctx.query,
      filters: {
        ...(ctx.query?.filters || {}),
        usuario: { id: { $eq: user.id } },
      },
    };

    return await super.find(ctx);
  },

  async create(ctx) {
    try {
      const authHeader = ctx.request.header.authorization;
      if (!authHeader) return ctx.unauthorized('Falta header Authorization');

      const parts = authHeader.split(' ');
      const token = parts.length === 2 ? parts[1] : authHeader.replace(/^Bearer\s+/i, '').trim();
      let decoded;
      try {
        decoded = jwt.verify(token, process.env.JWT_SECRET || 'montri-prod-secret-2025');
      } catch (err) {
        console.error('❌ Error verificando JWT:', err.message);
        return ctx.unauthorized('Token inválido o expirado');
      }

      const user = await strapi.db
        .query('plugin::users-permissions.user')
        .findOne({ where: { id: decoded.id } });
      if (!user) return ctx.unauthorized('Usuario no encontrado');
      console.log('✅ Token verificado para usuario:', user.id);

      console.log('🟢 Creando egreso para usuario:', user.id);
      const { data } = ctx.request.body;
      const newData = {
        ...data,
        usuario: user.id,
      };

      const entry = await strapi.entityService.create('api::egreso.egreso', {
        data: newData,
        populate: ['usuario'],
      });
      return entry;
    } catch (err) {
      ctx.throw(500, err);
    }
  },
}));
