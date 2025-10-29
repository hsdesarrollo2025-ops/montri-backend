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
      // En Strapi v4, auth debe ser un objeto; usar `{}` habilita autenticación por defecto
      config: { auth: {} },
    },
    {
      method: 'PUT',
      path: '/ingresos/:id',
      handler: 'ingreso.update',
      config: { auth: {} },
    },
    {
      method: 'DELETE',
      path: '/ingresos/:id',
      handler: 'ingreso.delete',
      config: { auth: {} },
    },
  ],
};

