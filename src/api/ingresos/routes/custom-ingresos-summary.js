'use strict';

module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/ingresos/summary',
      handler: 'ingresos-summary.find',
      config: {
        // En este proyecto usamos validación JWT en el controlador
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
  ],
};

