'use strict';

module.exports = {
  routes: [
    // Init profile
    { method: 'POST', path: '/fiscal-profile/init', handler: 'fiscal-profile.init', config: { auth: false } },
    // Current user profile (requires auth)
    { method: 'GET', path: '/fiscal-profile/me', handler: 'fiscal-profile.me', config: { auth: true } },
    // Section A
    { method: 'PUT', path: '/fiscal-profile/section/A', handler: 'fiscal-profile.updateSectionA', config: { auth: false } },
    { method: 'PUT', path: '/fiscal-profile/section/B', handler: 'fiscal-profile.updateSectionB', config: { auth: false } },
    { method: 'PUT', path: '/fiscal-profile/section/C', handler: 'fiscal-profile.updateSectionC', config: { auth: false } },
    // Validate status (must be before :userId)
    { method: 'GET', path: '/fiscal-profile/validate-status', handler: 'fiscal-profile.validateFiscalProfileStatus', config: { auth: false } },
    // Alias to avoid router param conflicts
    { method: 'GET', path: '/fiscal-profile/status', handler: 'fiscal-profile.validateFiscalProfileStatus', config: { auth: false } },
    // Get by user id
    { method: 'GET', path: '/fiscal-profile/:userId(\\d+)', handler: 'fiscal-profile.getFiscalProfile', config: { auth: false } },
    // Finalize
    { method: 'PUT', path: '/fiscal-profile/finalize', handler: 'fiscal-profile.finalize', config: { auth: false } },
    // Validations
    { method: 'GET', path: '/fiscal-profile/validate-cuit/:cuit', handler: 'fiscal-profile.validateCuit', config: { auth: false } },
    { method: 'GET', path: '/fiscal-profile/validate-category', handler: 'fiscal-profile.validateCategory', config: { auth: false } },
  ],
};
