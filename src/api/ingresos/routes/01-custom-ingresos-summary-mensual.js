'use strict';

module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/ingresos/summary-mensual',
      handler: 'ingresos-summary.summaryMensual',
      config: {
        // En este proyecto, la validación JWT se hace en el controlador
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
  ],
};

