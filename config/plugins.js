module.exports = ({ env }) => ({
  'users-permissions': {
    config: {
      jwt: {
        expiresIn: '30d',
      },
      jwtSecret: env('JWT_SECRET', 'montri-prod-secret-2025'),
    },
  },
});
