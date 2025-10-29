module.exports = ({ env }) => ({
  upload: {
    config: {
      provider: env('UPLOAD_PROVIDER', 'local'),
      providerOptions: {},
    },
  },
  'users-permissions': {
    config: {
      jwtSecret: env('JWT_SECRET', 'fallback-secret-montri'),
    },
  },
});
