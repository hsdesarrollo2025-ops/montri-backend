"use strict";

module.exports = {
  routes: [
    {
      method: "GET",
      path: "/dashboard/alerts",
      handler: "dashboard-alerts.alerts",
      config: {
        // Consistente con otras rutas personalizadas: validar JWT en el controlador
        auth: false,
      },
    },
  ],
};

