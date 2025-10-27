'use strict';

async function getAuthUserId(ctx) {
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

module.exports = {
  async find(ctx) {
    try {
      const userId = await getAuthUserId(ctx);
      if (!userId) return ctx.unauthorized('No autorizado');

      const all = await strapi.db.query('api::egreso.egreso').findMany({
        where: { usuario: userId },
        orderBy: { fecha: 'desc' },
        select: ['id', 'descripcion', 'fecha', 'monto'],
      });

      const safeNumber = (v) => {
        const n = Number(v);
        return Number.isFinite(n) ? n : 0;
      };

      const safeDate = (v) => {
        const d = new Date(v);
        return isNaN(d.getTime()) ? null : d;
      };

      const now = new Date();
      const currentMonth = (all || []).filter((e) => {
        const d = safeDate(e.fecha);
        return d && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      });

      const totalMes = currentMonth.reduce((acc, e) => acc + safeNumber(e.monto), 0);

      const semanal = [1, 2, 3, 4].map((sem) => ({
        semana: sem,
        monto: currentMonth
          .filter((e) => {
            const d = safeDate(e.fecha);
            return d && Math.ceil(d.getDate() / 7) === sem;
          })
          .reduce((acc, e) => acc + safeNumber(e.monto), 0),
      }));

      const ultimos = (all || [])
        .filter((e) => safeDate(e.fecha))
        .slice(0, 5)
        .map((e) => {
          const d = safeDate(e.fecha);
          return {
            id: e.id,
            descripcion: e.descripcion || 'Sin descripción',
            fecha: d ? d.toISOString().slice(0, 10) : null,
            monto: safeNumber(e.monto),
          };
        });

      return ctx.send({ totalMes, semanal, ultimos });
    } catch (err) {
      strapi.log.error('Error en /egresos/summary:', err);
      return ctx.internalServerError('Error al generar resumen');
    }
  },
  async summaryMensual(ctx) {
    try {
      const userId = await getAuthUserId(ctx);
      if (!userId) return ctx.unauthorized('No autorizado');

      const data = await strapi.db
        .query('api::egreso.egreso')
        .findMany({
          where: { usuario: userId },
          select: ['monto', 'fecha'],
        });

      const meses = [
        'Enero',
        'Febrero',
        'Marzo',
        'Abril',
        'Mayo',
        'Junio',
        'Julio',
        'Agosto',
        'Septiembre',
        'Octubre',
        'Noviembre',
        'Diciembre',
      ];

      const safeNumber = (v) => {
        const n = Number(v);
        return Number.isFinite(n) ? n : 0;
      };

      const safeDate = (v) => {
        const d = new Date(v);
        return isNaN(d.getTime()) ? null : d;
      };

      const acumulado = {};
      const now = new Date();
      const year = now.getFullYear();

      (data || []).forEach((item) => {
        const d = safeDate(item?.fecha);
        if (!d || d.getFullYear() !== year) return;
        const mesIndex = d.getMonth();
        const mes = meses[mesIndex];
        acumulado[mes] = (acumulado[mes] || 0) + safeNumber(item?.monto);
      });

      const mensual = meses
        .map((mes) => ({ mes, monto: acumulado[mes] || 0 }))
        .filter((x) => x.monto > 0);

      const totalAnual = mensual.reduce((acc, cur) => acc + safeNumber(cur.monto), 0);

      return ctx.send({ totalAnual, mensual });
    } catch (err) {
      strapi.log.error('Error en /egresos/summary-mensual:', err);
      return ctx.internalServerError('Error al obtener resumen mensual');
    }
  },
};
