'use strict';

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::ingreso.ingreso', ({ strapi }) => ({
  async find(ctx) {
    console.log('Authorization Header:', ctx.request.header.authorization);
    console.log('User from state:', ctx.state.user);
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
      console.log('Authorization Header:', ctx.request.header.authorization);
      console.log('User from state:', ctx.state.user);
      const user = ctx.state.user;
      if (!user) {
        return ctx.unauthorized('Token inválido o usuario no autenticado');
      }

      const { data } = ctx.request.body;
      const newData = {
        ...data,
        usuario: user.id,
      };

      const entity = await strapi.db.query('api::ingreso.ingreso').create({ data: newData });
      return entity;
    } catch (err) {
      ctx.throw(500, err);
    }
  },
}));

