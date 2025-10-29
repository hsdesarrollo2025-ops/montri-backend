'use strict';

module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/ingresos',
      handler: 'ingreso.find',
      config: {
        auth: {
          strategies: ['api::users-permissions.jwt'],
        },
      },
    },
    {
      method: 'GET',
      path: '/ingresos/:id(\\d+)',
      handler: 'ingreso.findOne',
      config: {
        auth: {
          strategies: ['api::users-permissions.jwt'],
        },
      },
    },
    {
      method: 'POST',
      path: '/ingresos',
      handler: 'ingreso.create',
      config: {
        auth: {
          strategies: ['api::users-permissions.jwt'],
        },
      },
    },
    {
      method: 'PUT',
      path: '/ingresos/:id',
      handler: 'ingreso.update',
      config: {
        auth: {
          strategies: ['api::users-permissions.jwt'],
        },
      },
    },
    {
      method: 'DELETE',
      path: '/ingresos/:id',
      handler: 'ingreso.delete',
      config: {
        auth: {
          strategies: ['api::users-permissions.jwt'],
        },
      },
    },
  ],
};

