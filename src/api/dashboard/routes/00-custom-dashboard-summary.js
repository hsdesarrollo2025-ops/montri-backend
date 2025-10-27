'use strict';

module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/dashboard/summary',
      handler: 'dashboard-summary.find',
      config: {
        // Validación JWT se hace en el controlador para mantener compatibilidad
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
  ],
};

