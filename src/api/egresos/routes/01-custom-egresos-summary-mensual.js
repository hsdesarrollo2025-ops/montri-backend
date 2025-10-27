'use strict';

module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/egresos/summary-mensual',
      handler: 'egresos-summary.summaryMensual',
      config: {
        // En este proyecto, la validación JWT se hace en el controlador
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
  ],
};

