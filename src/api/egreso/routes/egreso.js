'use strict';

module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/egresos',
      handler: 'egreso.find',
      config: {
        auth: { scope: ['authenticated'] },
      },
    },
    {
      method: 'GET',
      path: '/egresos/:id(\\d+)',
      handler: 'egreso.findOne',
      config: {
        auth: { scope: ['authenticated'] },
      },
    },
    {
      method: 'POST',
      path: '/egresos',
      handler: 'egreso.create',
      config: {
        auth: { scope: ['authenticated'] },
      },
    },
    {
      method: 'PUT',
      path: '/egresos/:id',
      handler: 'egreso.update',
      config: {
        auth: { scope: ['authenticated'] },
      },
    },
    {
      method: 'DELETE',
      path: '/egresos/:id',
      handler: 'egreso.delete',
      config: {
        auth: { scope: ['authenticated'] },
      },
    },
  ],
};
