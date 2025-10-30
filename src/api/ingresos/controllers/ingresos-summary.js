'use strict';

const { startOfMonth, endOfMonth, parseISO, isWithinInterval } = require('date-fns');

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

      const all = await strapi.db.query('api::ingreso.ingreso').findMany({
        where: { usuario: userId },
        orderBy: { fecha: 'desc' },
        select: ['id', 'descripcion', 'fecha', 'monto'],
      });

      const safeNumber = (v) => {
        const n = Number(v);
        return Number.isFinite(n) ? n : 0;
      };

      const now = new Date();
      const inicioMes = startOfMonth(now);
      const finMes = endOfMonth(now);

      const movimientosMes = (all || []).filter((m) => {
        const d = parseISO(String(m.fecha));
        return isWithinInterval(d, { start: inicioMes, end: finMes });
      });

      const semanas = [1, 2, 3, 4, 5].map((n) => ({ semana: n, monto: 0 }));
      movimientosMes.forEach((m) => {
        const day = new Date(m.fecha).getDate();
        const weekOfMonth = Math.ceil((day - 1) / 7) + 1;
        const idx = Math.min(weekOfMonth - 1, semanas.length - 1);
        semanas[idx].monto += safeNumber(m.monto);
      });

      const totalMes = movimientosMes.reduce((acc, m) => acc + safeNumber(m.monto), 0);

      const ultimos = movimientosMes
        .slice()
        .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
        .slice(0, 5)
        .map((m) => ({
          id: m.id,
          descripcion: m.descripcion,
          fecha: m.fecha,
          monto: safeNumber(m.monto),
        }));

      return ctx.send({ totalMes, semanal: semanas, ultimos });
    } catch (err) {
      strapi.log.error('Error en /ingresos/summary:', err);
      return ctx.internalServerError('Error al generar resumen');
    }
  },

  async summaryMensual(ctx) {
    try {
      const userId = await getAuthUserId(ctx);
      if (!userId) return ctx.unauthorized('No autorizado');

      const data = await strapi.db
        .query('api::ingreso.ingreso')
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
      strapi.log.error('Error en /ingresos/summary-mensual:', err);
      return ctx.internalServerError('Error al obtener resumen mensual');
    }
  },
};

