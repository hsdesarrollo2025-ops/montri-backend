'use strict';

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::egreso.egreso', ({ strapi }) => ({
  async find(ctx) {
    const user = ctx.state.user;
    if (!user) {
      return ctx.unauthorized('Token inválido o usuario no autenticado');
    }

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
      const user = ctx.state.user;
      console.log('AUTH USER:', user);
      if (!user) {
        console.log('CTX STATE:', ctx.state);
        return ctx.unauthorized('Token inválido o usuario no autenticado');
      }

      const { data } = ctx.request.body;
      const newData = {
        ...data,
        usuario: user.id,
      };

      const entity = await strapi.db.query('api::egreso.egreso').create({ data: newData });
      return entity;
    } catch (err) {
      ctx.throw(500, err);
    }
  },
}));

