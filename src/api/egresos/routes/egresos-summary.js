"use strict";

module.exports = {
  routes: [
    {
      method: "GET",
      path: "/egresos/summary",
      handler: "egresos-summary.find",
      config: { auth: true },
    },
  ],
};

