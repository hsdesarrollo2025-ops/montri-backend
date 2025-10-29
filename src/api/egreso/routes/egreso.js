'use strict';

module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/egresos',
      handler: 'egreso.find',
      config: { auth: {} },
    },
    {
      method: 'GET',
      path: '/egresos/:id(\\d+)',
      handler: 'egreso.findOne',
      config: { auth: {} },
    },
    {
      method: 'POST',
      path: '/egresos',
      handler: 'egreso.create',
      config: { auth: {} },
    },
    {
      method: 'PUT',
      path: '/egresos/:id',
      handler: 'egreso.update',
      config: { auth: {} },
    },
    {
      method: 'DELETE',
      path: '/egresos/:id',
      handler: 'egreso.delete',
      config: { auth: {} },
    },
  ],
};

