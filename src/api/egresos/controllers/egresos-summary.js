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
      // Usar entityService para alinearnos con el resto del proyecto
      const movimientos = await strapi.entityService.findMany('api::egreso.egreso', {
        filters: { usuario: userId },
        sort: { fecha: 'desc' },
        fields: ['id', 'descripcion', 'fecha', 'monto'],
      });

      // Parser tolerante de fecha (ISO o texto largo) normalizado a LOCAL mediodía
      function parseFecha(fechaStr) {
        if (!fechaStr) return null;
        const s = String(fechaStr).trim();
        const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (m) {
          const y = Number(m[1]);
          const mo = Number(m[2]);
          const d = Number(m[3]);
          return new Date(y, (mo || 1) - 1, d || 1, 12, 0, 0, 0);
        }
        const direct = new Date(s);
        if (!isNaN(direct)) return direct;
        const cleaned = s.replace(/,/g, '');
        const fallback = new Date(cleaned);
        return isNaN(fallback) ? null : fallback;
      }

      const safeNumber = (v) => {
        if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
        if (typeof v === 'string') {
          const t = v.trim().replace(/\./g, '').replace(/,/g, '.');
          const n = Number(t);
          return Number.isFinite(n) ? n : 0;
        }
        return 0;
      };

      // Mes actual en zona horaria de negocio
      const BUSINESS_TZ = process.env.BUSINESS_TZ || process.env.DASHBOARD_TZ || 'America/Argentina/Buenos_Aires';
      const monthKeyInTZ = (date) => {
        const parts = new Intl.DateTimeFormat('en-US', {
          timeZone: BUSINESS_TZ,
          year: 'numeric',
          month: '2-digit',
        }).formatToParts(date);
        const y = parts.find((p) => p.type === 'year')?.value;
        const m = parts.find((p) => p.type === 'month')?.value;
        return y && m ? `${y}-${m}` : null;
      };
      const monthKey = monthKeyInTZ(new Date());

      const movimientosMes = (movimientos || []).filter((m) => {
        const fecha = parseFecha(m.fecha);
        if (!fecha || !monthKey) return false;
        return monthKeyInTZ(fecha) === monthKey;
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
