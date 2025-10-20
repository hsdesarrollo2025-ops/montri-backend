'use strict';

const bcrypt = require('bcryptjs');

module.exports = {
  async login(ctx) {
    try {
      const { identifier, password } = ctx.request.body || {};

      if (!identifier || !password) {
        return ctx.badRequest('Missing identifier or password');
      }

      const lowered = typeof identifier === 'string' ? identifier.toLowerCase() : identifier;

      const user = await strapi.db
        .query('plugin::users-permissions.user')
        .findOne({
          where: {
            $or: [{ email: lowered }, { username: identifier }],
          },
        });

      if (!user) {
        return ctx.unauthorized('Invalid identifier or password');
      }

      if (user.blocked || !user.confirmed) {
        return ctx.forbidden('User blocked or unconfirmed');
      }

      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return ctx.unauthorized('Invalid identifier or password');
      }

      const token = strapi.plugins['users-permissions'].services.jwt.issue({ id: user.id });

      ctx.body = {
        jwt: token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          planType: user.planType,
          provider: user.provider,
        },
      };
    } catch (err) {
      strapi.log.error('Custom login error', err);
      return ctx.internalServerError('An error occurred');
    }
  },
};
