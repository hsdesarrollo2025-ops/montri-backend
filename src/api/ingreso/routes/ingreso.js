'use strict';

module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/ingresos',
      handler: 'ingreso.find',
      config: { auth: false },
    },
    {
      method: 'GET',
      path: '/ingresos/:id(\\d+)',
      handler: 'ingreso.findOne',
      config: { auth: false },
    },
    {
      method: 'POST',
      path: '/ingresos',
      handler: 'ingreso.create',
      config: { auth: false },
    },
    {
      method: 'PUT',
      path: '/ingresos/:id',
      handler: 'ingreso.update',
      config: { auth: false },
    },
    {
      method: 'DELETE',
      path: '/ingresos/:id',
      handler: 'ingreso.delete',
      config: { auth: false },
    },
  ],
};

