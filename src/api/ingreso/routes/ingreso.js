'use strict';

module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/ingresos',
      handler: 'ingreso.find',
      config: {
        auth: { scope: ['authenticated'] },
      },
    },
    {
      method: 'GET',
      path: '/ingresos/:id(\\d+)',
      handler: 'ingreso.findOne',
      config: {
        auth: { scope: ['authenticated'] },
      },
    },
    {
      method: 'POST',
      path: '/ingresos',
      handler: 'ingreso.create',
      config: {
        auth: { scope: ['authenticated'] },
      },
    },
    {
      method: 'PUT',
      path: '/ingresos/:id',
      handler: 'ingreso.update',
      config: {
        auth: { scope: ['authenticated'] },
      },
    },
    {
      method: 'DELETE',
      path: '/ingresos/:id',
      handler: 'ingreso.delete',
      config: {
        auth: { scope: ['authenticated'] },
      },
    },
  ],
};
