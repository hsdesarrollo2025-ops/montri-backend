"use strict";

module.exports = {
  routes: [
    {
      method: "GET",
      path: "/dashboard/summary",
      handler: "dashboard.summary",
      config: {
        auth: false,
      },
    },
  ],
};

