'use strict';

module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/enums',
      handler: 'enums.find',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
  ],
};

