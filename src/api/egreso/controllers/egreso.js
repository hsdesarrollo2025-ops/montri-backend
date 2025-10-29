'use strict';

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::egreso.egreso', ({ strapi }) => ({
  async create(ctx) {
    try {
      const user = ctx.state.user;
      if (!user) {
        return ctx.unauthorized('Usuario no autenticado');
      }

      const { data } = ctx.request.body;
      const newData = {
        ...data,
        usuario: user.id,
      };

      const response = await strapi.service('api::egreso.egreso').create({ data: newData });
      return response;
    } catch (err) {
      ctx.throw(500, err);
    }
  },
}));

