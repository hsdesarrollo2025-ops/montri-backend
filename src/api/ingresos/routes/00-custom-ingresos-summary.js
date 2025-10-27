'use strict';

module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/ingresos/summary',
      handler: 'ingresos-summary.find',
      config: {
        // En este proyecto, la validación JWT se hace en el controlador
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
  ],
};

