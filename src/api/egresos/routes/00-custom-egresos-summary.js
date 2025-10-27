'use strict';

module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/egresos/summary',
      handler: 'egresos-summary.find',
      config: {
        // En este proyecto, la validación JWT se hace en el controlador
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
  ],
};

