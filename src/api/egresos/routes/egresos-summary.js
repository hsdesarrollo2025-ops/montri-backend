"use strict";

module.exports = {
  routes: [
    {
      method: "GET",
      path: "/egresos/summary",
      handler: "egresos-summary.find",
      // Strapi routing in this project validates JWT in the controller. Keep route public.
      config: { auth: false },
    },
  ],
};
