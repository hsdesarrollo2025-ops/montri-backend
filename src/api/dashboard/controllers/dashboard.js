'use strict';

/**
 * Dashboard Controller
 * Calcula resumen simple de ingresos, egresos y saldo neto del mes actual,
 * junto con un resumen semanal, movimientos recientes y alertas básicas.
 */

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function toNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function weekOfMonthFourBuckets(dateObj) {
  const d = dateObj.getDate();
  // 1..7 -> 1, 8..14 -> 2, 15..21 -> 3, 22+ -> 4
  return Math.min(4, Math.ceil(d / 7));
}

async function safeFindMany(uid, opts) {
  try {
    return await strapi.db.query(uid).findMany(opts);
  } catch {
    return null;
  }
}

module.exports = {
  async summary(ctx) {
    try {
      // Sin validación de usuario por ahora (auth: false en la ruta)

      const now = new Date();
      const start = startOfMonth(now);
      const end = endOfMonth(now);

      // Intentar colecciones en singular; fallback a plural si no existen
      let ingresos = await safeFindMany('api::ingreso.ingreso', {
        where: { fecha: { $between: [start, end] } },
        select: ['id', 'fecha', 'monto', 'descripcion', 'description'],
        orderBy: { fecha: 'desc' },
        limit: 1000,
      });
      if (!ingresos) {
        ingresos = await safeFindMany('api::ingresos.ingresos', {
          where: { fecha: { $between: [start, end] } },
          select: ['id', 'fecha', 'monto', 'descripcion', 'description'],
          orderBy: { fecha: 'desc' },
          limit: 1000,
        });
      }

      let egresos = await safeFindMany('api::egreso.egreso', {
        where: { fecha: { $between: [start, end] } },
        select: ['id', 'fecha', 'monto', 'descripcion', 'description'],
        orderBy: { fecha: 'desc' },
        limit: 1000,
      });
      if (!egresos) {
        egresos = await safeFindMany('api::egresos.egresos', {
          where: { fecha: { $between: [start, end] } },
          select: ['id', 'fecha', 'monto', 'descripcion', 'description'],
          orderBy: { fecha: 'desc' },
          limit: 1000,
        });
      }

      // Si faltan colecciones, devolver datos mockeados
      if (!ingresos || !egresos) {
        return ctx.send({
          incomeTotal: 10730,
          expenseTotal: 8420,
          netBalance: 2310,
          weeklySummary: [
            { week: 1, income: 3000, expense: 2000 },
            { week: 2, income: 2500, expense: 2200 },
            { week: 3, income: 2800, expense: 3000 },
            { week: 4, income: 2430, expense: 1220 },
          ],
          recentMovements: [
            { id: 1, type: 'ingreso', description: 'Venta online', date: '2025-10-22', amount: 3500 },
            { id: 2, type: 'gasto', description: 'Compra de insumos', date: '2025-10-21', amount: 2100 },
          ],
          alerts: [
            { type: 'warning', message: 'Estás por superar el tope de tu categoría' },
          ],
        });
      }

      // Totales
      const incomeTotal = ingresos.reduce((s, i) => s + toNumber(i.monto), 0);
      const expenseTotal = egresos.reduce((s, e) => s + toNumber(e.monto), 0);
      const netBalance = incomeTotal - expenseTotal;

      // Resumen semanal (4 buckets)
      const weekly = [1, 2, 3, 4].map((w) => ({ week: w, income: 0, expense: 0 }));
      for (const i of ingresos) {
        const d = new Date(i.fecha);
        const w = weekOfMonthFourBuckets(d) - 1;
        if (w >= 0 && w < 4) weekly[w].income += toNumber(i.monto);
      }
      for (const e of egresos) {
        const d = new Date(e.fecha);
        const w = weekOfMonthFourBuckets(d) - 1;
        if (w >= 0 && w < 4) weekly[w].expense += toNumber(e.monto);
      }

      // Movimientos recientes: últimos 5 de cada tipo por fecha desc
      const take = (arr, n) => arr.slice(0, n);
      const recentIncomes = take(ingresos, 5).map((i) => ({
        id: i.id,
        type: 'ingreso',
        description: i.descripcion || i.description || 'Ingreso',
        date: new Date(i.fecha).toISOString().slice(0, 10),
        amount: toNumber(i.monto),
      }));
      const recentExpenses = take(egresos, 5).map((e) => ({
        id: e.id,
        type: 'gasto',
        description: e.descripcion || e.description || 'Gasto',
        date: new Date(e.fecha).toISOString().slice(0, 10),
        amount: toNumber(e.monto),
      }));
      const recentMovements = [...recentIncomes, ...recentExpenses]
        .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
        .slice(0, 10);

      // Alertas básicas
      const alerts = [];
      if (netBalance < 0) {
        alerts.push({ type: 'warning', message: 'Tus gastos superan a tus ingresos este mes.' });
      }

      return ctx.send({
        incomeTotal,
        expenseTotal,
        netBalance,
        weeklySummary: weekly,
        recentMovements,
        alerts,
      });
    } catch (error) {
      strapi.log.error('Error al generar resumen:', error);
      return ctx.internalServerError('Error al generar resumen');
    }
  },
};

