'use strict';

const { createCoreController } = require('@strapi/strapi').factories;
const jwt = require('jsonwebtoken');

module.exports = createCoreController('api::ingreso.ingreso', ({ strapi }) => ({
  async find(ctx) {
    try {
      const authHeader = ctx.request.header.authorization;
      if (!authHeader) return ctx.unauthorized('Falta header Authorization');

      const parts = authHeader.split(' ');
      const token = parts.length === 2 ? parts[1] : authHeader.replace(/^Bearer\s+/i, '').trim();

      let decoded;
      try {
        decoded = jwt.verify(token, process.env.JWT_SECRET || 'montri-prod-secret-2025');
      } catch (err) {
        return ctx.unauthorized('Token inválido o expirado');
      }

      const user = await strapi.db
        .query('plugin::users-permissions.user')
        .findOne({ where: { id: decoded.id } });
      if (!user) return ctx.unauthorized('Usuario no encontrado');

      const data = await strapi.entityService.findMany('api::ingreso.ingreso', {
        filters: { usuario: user.id },
        populate: '*',
        sort: { fecha: 'desc' },
      });

      return data;
    } catch (error) {
      strapi.log.error('Error en find de ingresos:', error);
      return ctx.internalServerError('Error al obtener ingresos');
    }
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
        
        return ctx.unauthorized('Token inválido o expirado');
      }

      const user = await strapi.db
        .query('plugin::users-permissions.user')
        .findOne({ where: { id: decoded.id } });
      if (!user) return ctx.unauthorized('Usuario no encontrado');
      

      
      const { data } = ctx.request.body;
      const newData = {
        ...data,
        usuario: user.id,
      };

      const entry = await strapi.entityService.create('api::ingreso.ingreso', {
        data: newData,
        populate: ['usuario'],
      });
      return entry;
    } catch (err) {
      ctx.throw(500, err);
    }
  },
}));






