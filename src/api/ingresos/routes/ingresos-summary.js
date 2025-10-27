"use strict";

module.exports = {
  routes: [
    {
      method: "GET",
      path: "/ingresos/summary",
      handler: "ingresos-summary.find",
      // Strapi routing in this project validates JWT in the controller. Keep route public.
      config: { auth: false },
    },
  ],
};
