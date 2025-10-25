'use strict';

// Helper para obtener ID del usuario autenticado (mismo patrón que fiscal-profile)
async function getAuthUserId(ctx) {
  const auth = ctx.request.header?.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return null;
  try {
    const payload = await strapi.plugins['users-permissions'].services.jwt.verify(token);
    return payload?.id || null;
  } catch (err) {
    return null;
  }
}

module.exports = {
  async summary(ctx) {
    try {
      const userId = await getAuthUserId(ctx);
      if (!userId) return ctx.unauthorized('No autorizado');

      // Calcular primer día del mes actual y el primer día del mes siguiente
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

      // Buscar ingresos del mes (por campo fecha)
      const ingresos = await strapi.db.query('api::ingreso.ingreso').findMany({
        where: {
          user: userId,
          fecha: { $gte: startOfMonth, $lt: startOfNextMonth },
        },
        select: ['monto'],
      });

      // Buscar egresos del mes (por campo fecha)
      const egresos = await strapi.db.query('api::egreso.egreso').findMany({
        where: {
          user: userId,
          fecha: { $gte: startOfMonth, $lt: startOfNextMonth },
        },
        select: ['monto', 'deducible'],
      });

      const toNumber = (v) => {
        const n = Number(v);
        return Number.isFinite(n) ? n : 0;
      };

      const totalIngresos = (ingresos || []).reduce((sum, i) => sum + toNumber(i.monto), 0);
      const totalEgresos = (egresos || []).reduce((sum, e) => sum + toNumber(e.monto), 0);
      const totalDeducibles = (egresos || [])
        .filter((e) => e?.deducible === true)
        .reduce((sum, e) => sum + toNumber(e.monto), 0);

      const saldoEstimado = totalIngresos - totalDeducibles;

      ctx.send({
        mes: now.toLocaleString('es-AR', { month: 'long', year: 'numeric' }),
        totalIngresos,
        totalEgresos,
        totalDeducibles,
        saldoEstimado,
      });
    } catch (error) {
      strapi.log.error('Error en /dashboard/summary:', error);
      ctx.internalServerError('Error al generar resumen');
    }
  },
};

