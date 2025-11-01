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
      let userId = ctx.state?.user?.id;
      if (!userId) {
        const auth = ctx.request.header?.authorization || '';
        const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
        if (token) {
          try {
            const payload = await strapi.plugins['users-permissions'].services.jwt.verify(token);
            userId = payload?.id;
          } catch (e) {
            // ignore invalid token
          }
        }
      }
      if (!userId) return ctx.unauthorized('No autorizado');

      // Traer todos los movimientos del usuario autenticado
      const movimientos = await strapi.db.query('api::egreso.egreso').findMany({
        where: { usuario: userId },
        orderBy: { fecha: 'desc' },
        select: ['id', 'descripcion', 'fecha', 'monto'],
      });

      // Parser tolerante de fecha (ISO o texto largo)
      function parseFecha(fechaStr) {
        const parsed = new Date(fechaStr);
        if (!isNaN(parsed)) return parsed;
        const cleaned = fechaStr?.replace(/,/g, '');
        return new Date(cleaned);
      }

      const safeNumber = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

      // Ventana del mes actual
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      const movimientosMes = (movimientos || []).filter((m) => {
        const fecha = parseFecha(m.fecha);
        return fecha >= startOfMonth && fecha <= endOfMonth;
      });

      // Suma semanal en 5 buckets
      const semanal = [1, 2, 3, 4, 5].map((n) => ({ semana: n, monto: 0 }));
      movimientosMes.forEach((m) => {
        const fecha = parseFecha(m.fecha);
        const day = fecha.getDate();
        const weekOfMonth = Math.ceil((day - 1) / 7) + 1;
        const idx = Math.min(Math.max(weekOfMonth - 1, 0), semanal.length - 1);
        semanal[idx].monto += safeNumber(m.monto);
      });

      const totalMes = movimientosMes.reduce((acc, m) => acc + safeNumber(m.monto), 0);

      const ultimos = movimientosMes
        .slice()
        .sort((a, b) => parseFecha(b.fecha) - parseFecha(a.fecha))
        .slice(0, 5)
        .map((m) => ({ id: m.id, descripcion: m.descripcion, fecha: m.fecha, monto: safeNumber(m.monto) }));

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

      const safeNumber = (v) => {
        const n = Number(v);
        return Number.isFinite(n) ? n : 0;
      };

      const mesesNombres = [
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

      const { startOfYear, endOfYear, isWithinInterval, parseISO, getMonth } = require('date-fns');
      const now = new Date();
      const inicioAnio = startOfYear(now);
      const finAnio = endOfYear(now);

      const movimientosAnio = (data || []).filter((m) => {
        const d = parseISO(String(m.fecha));
        return isWithinInterval(d, { start: inicioAnio, end: finAnio });
      });

      const mensual = mesesNombres.map((mes, i) => ({
        mes,
        monto: (movimientosAnio || [])
          .filter((m) => getMonth(parseISO(String(m.fecha))) === i)
          .reduce((acc, m) => acc + safeNumber(m.monto), 0),
      }));

      const totalAnual = mensual.reduce((acc, m) => acc + safeNumber(m.monto), 0);

      return ctx.send({ totalAnual, mensual });
    } catch (err) {
      strapi.log.error('Error en /egresos/summary-mensual:', err);
      return ctx.internalServerError('Error al obtener resumen mensual');
    }
  },
};
