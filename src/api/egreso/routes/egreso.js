'use strict';

module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/egresos',
      handler: 'egreso.find',
      config: {
        auth: {
          strategies: ['api::users-permissions.jwt'],
        },
      },
    },
    {
      method: 'GET',
      path: '/egresos/:id(\\d+)',
      handler: 'egreso.findOne',
      config: {
        auth: {
          strategies: ['api::users-permissions.jwt'],
        },
      },
    },
    {
      method: 'POST',
      path: '/egresos',
      handler: 'egreso.create',
      config: {
        auth: {
          strategies: ['api::users-permissions.jwt'],
        },
      },
    },
    {
      method: 'PUT',
      path: '/egresos/:id',
      handler: 'egreso.update',
      config: {
        auth: {
          strategies: ['api::users-permissions.jwt'],
        },
      },
    },
    {
      method: 'DELETE',
      path: '/egresos/:id',
      handler: 'egreso.delete',
      config: {
        auth: {
          strategies: ['api::users-permissions.jwt'],
        },
      },
    },
  ],
};

