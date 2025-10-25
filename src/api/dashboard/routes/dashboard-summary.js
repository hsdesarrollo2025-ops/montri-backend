"use strict";

module.exports = {
  routes: [
    {
      method: "GET",
      path: "/dashboard/summary",
      handler: "dashboard-summary.summary",
      config: {
        // Mantener consistencia con otras rutas personalizadas del proyecto
        // (se valida JWT en el controlador)
        auth: false,
      },
    },
  ],
};

