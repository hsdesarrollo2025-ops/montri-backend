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

// Número robusto (acepta string con separadores)
function safeNumber(v) {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  if (typeof v === 'string') {
    const t = v.trim().replace(/\./g, '').replace(/,/g, '.');
    const n = Number(t);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

// Fecha robusta (ISO YYYY-MM-DD a mediodía local; también texto largo)
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

// Mes en TZ de negocio
function monthKeyInTZ(date, tz) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(date);
  const y = parts.find((p) => p.type === 'year')?.value;
  const m = parts.find((p) => p.type === 'month')?.value;
  return y && m ? `${y}-${m}` : null;
}

module.exports = {
  async find(ctx) {
    try {
      const userId = await getAuthUserId(ctx);
      if (!userId) return ctx.unauthorized('Usuario no autenticado');

      const BUSINESS_TZ = process.env.BUSINESS_TZ || process.env.DASHBOARD_TZ || 'America/Argentina/Buenos_Aires';
      const monthKey = monthKeyInTZ(new Date(), BUSINESS_TZ);

      // Traer movimientos del usuario (sin filtrar por fecha en DB)
      const [ingresos, egresos] = await Promise.all([
        strapi.entityService.findMany('api::ingreso.ingreso', {
          filters: { usuario: userId },
          sort: { fecha: 'desc' },
          fields: ['id', 'descripcion', 'fecha', 'monto'],
        }),
        strapi.entityService.findMany('api::egreso.egreso', {
          filters: { usuario: userId },
          sort: { fecha: 'desc' },
          fields: ['id', 'descripcion', 'fecha', 'monto'],
        }),
      ]);

      const buildSummary = (records) => {
        const current = (records || []).filter((r) => {
          const d = parseFecha(r.fecha);
          return d && monthKey && monthKeyInTZ(d, BUSINESS_TZ) === monthKey;
        });

        const totalMes = current.reduce((acc, r) => acc + safeNumber(r.monto), 0);

        // 5 semanas para cubrir meses largos
        const semanal = [1, 2, 3, 4, 5].map((n) => ({ semana: n, monto: 0 }));
        current.forEach((r) => {
          const d = parseFecha(r.fecha);
          const day = d.getDate();
          const weekOfMonth = Math.ceil((day - 1) / 7) + 1;
          const idx = Math.min(Math.max(weekOfMonth - 1, 0), semanal.length - 1);
          semanal[idx].monto += safeNumber(r.monto);
        });

        const ultimos = current
          .slice()
          .sort((a, b) => (parseFecha(b.fecha) - parseFecha(a.fecha)))
          .slice(0, 5)
          .map((r) => ({ id: r.id, descripcion: r.descripcion || 'Sin descripción', fecha: r.fecha, monto: safeNumber(r.monto) }));

        return { totalMes, semanal, ultimos };
      };

      const ingresosSummary = buildSummary(ingresos);
      const egresosSummary = buildSummary(egresos);

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

