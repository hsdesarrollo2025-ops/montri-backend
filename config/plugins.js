module.exports = ({ env }) => ({
  upload: {
    config: {
      provider: env('UPLOAD_PROVIDER', 'local'),
      providerOptions: {},
    },
  },
  'users-permissions': {
    config: {
      jwtSecret: env('JWT_SECRET', 'montri-prod-secret-2025'),
    },
  },
});
