'use strict';

// Helper para obtener ID del usuario autenticado
async function getAuthUserId(ctx) {
  if (ctx.state?.user?.id) return ctx.state.user.id;
  const auth = ctx.request.header?.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return null;
  try {
    const payload = await strapi.plugins['users-permissions'].services.jwt.verify(token);
    return payload?.id || null;
  } catch {
    return null;
  }
}

function safeNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function safeDate(v) {
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

module.exports = {
  async find(ctx) {
    try {
      const userId = await getAuthUserId(ctx);
      if (!userId) return ctx.unauthorized('Usuario no autenticado');

      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);

      // Ingresos del mes
      let ingresos = [];
      try {
        ingresos = await strapi.db.query('api::ingreso.ingreso').findMany({
          where: { usuario: userId, fecha: { $gte: start, $lt: next } },
          select: ['id', 'descripcion', 'fecha', 'monto'],
          orderBy: { fecha: 'desc' },
        });
      } catch {}

      // Egresos del mes
      let egresos = [];
      try {
        egresos = await strapi.db.query('api::egreso.egreso').findMany({
          where: { usuario: userId, fecha: { $gte: start, $lt: next } },
          select: ['id', 'descripcion', 'fecha', 'monto'],
          orderBy: { fecha: 'desc' },
        });
      } catch {}

      const resumen = (records) => {
        const current = (records || []).filter((r) => {
          const d = safeDate(r.fecha);
          return d && d >= start && d < next;
        });
        const totalMes = current.reduce((acc, r) => acc + safeNumber(r.monto), 0);
        const semanal = [1, 2, 3, 4].map((sem) => ({
          semana: sem,
          monto: current
            .filter((r) => {
              const d = safeDate(r.fecha);
              return d && Math.ceil(d.getDate() / 7) === sem;
            })
            .reduce((acc, r) => acc + safeNumber(r.monto), 0),
        }));
        const ultimos = (records || [])
          .filter((r) => safeDate(r.fecha))
          .slice(0, 5)
          .map((r) => {
            const d = safeDate(r.fecha);
            return {
              id: r.id,
              descripcion: r.descripcion || 'Sin descripción',
              fecha: d ? d.toISOString().slice(0, 10) : null,
              monto: safeNumber(r.monto),
            };
          });
        return { totalMes, semanal, ultimos };
      };

      const ingresosSummary = resumen(ingresos);
      const egresosSummary = resumen(egresos);

      const totalIngresos = ingresosSummary.totalMes;
      const totalEgresos = egresosSummary.totalMes;
      const balanceNeto = totalIngresos - totalEgresos;

      return ctx.send({
        status: 'success',
        data: {
          ingresos: totalIngresos,
          egresos: totalEgresos,
          balance: balanceNeto,
          detalle: {
            ingresos: ingresosSummary,
            egresos: egresosSummary,
          },
        },
      });
    } catch (error) {
      strapi.log.error('Error en dashboard summary:', error);
      return ctx.internalServerError('Error al generar resumen del dashboard');
    }
  },
};
