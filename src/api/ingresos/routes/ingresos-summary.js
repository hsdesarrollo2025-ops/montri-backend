"use strict";

module.exports = {
  routes: [
    {
      method: "GET",
      path: "/ingresos/summary",
      handler: "ingresos-summary.find",
      config: { auth: true },
    },
  ],
};

