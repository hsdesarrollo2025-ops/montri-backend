'use strict';

module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/egresos',
      handler: 'egreso.find',
      config: { auth: false },
    },
    {
      method: 'GET',
      path: '/egresos/:id(\\d+)',
      handler: 'egreso.findOne',
      config: { auth: false },
    },
    {
      method: 'POST',
      path: '/egresos',
      handler: 'egreso.create',
      config: { auth: false },
    },
    {
      method: 'PUT',
      path: '/egresos/:id',
      handler: 'egreso.update',
      config: { auth: false },
    },
    {
      method: 'DELETE',
      path: '/egresos/:id',
      handler: 'egreso.delete',
      config: { auth: false },
    },
  ],
};

