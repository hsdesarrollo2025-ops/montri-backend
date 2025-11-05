'use strict';

// Wire custom auth.register to override the plugin behavior
module.exports = (plugin) => {
  const customAuth = require('./controllers/auth');

  if (customAuth && typeof customAuth.register === 'function') {
    plugin.controllers.auth.register = customAuth.register;
  }

  return plugin;
};

