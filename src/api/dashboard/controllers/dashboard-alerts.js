'use strict';

// Helper para obtener ID del usuario autenticado (mismo patrón que usamos en otros controladores)
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
  async alerts(ctx) {
    try {
      const userId = await getAuthUserId(ctx);
      if (!userId) return ctx.unauthorized('No autorizado');

      const now = new Date();
      const limitDate = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000);

      // 1) Perfil fiscal del usuario (usa content-type existente fiscal-profile)
      const perfil = await strapi.db
        .query('api::fiscal-profile.fiscal-profile')
        .findOne({ where: { user: userId }, select: ['regime', 'category', 'annualRevenue'] });

      // Si no hay perfil, devolver alerta genérica y sin vencimientos
      if (!perfil) {
        return ctx.send({
          vencimientos: [],
          alertas: [
            { tipo: 'perfil', mensaje: 'Completá tu perfil para activar recordatorios.' },
          ],
        });
      }

      // 2) Vencimientos próximos (estructura esperada calendario-fiscal)
      // Nota: El content-type puede variar; aquí usamos el sugerido en los requisitos.
      let vencimientos = [];
      try {
        vencimientos = await strapi.db.query('api::calendario-fiscal.calendario-fiscal').findMany({
          where: {
            regimen: perfil?.regime || 'Monotributista',
            fecha: { $gte: now, $lte: limitDate },
          },
          select: ['titulo', 'fecha'],
          orderBy: { fecha: 'asc' },
        });
      } catch (e) {
        // Si el CT de calendario aún no existe, devolver vacío sin romper el endpoint
        vencimientos = [];
      }

      // 3) Alertas dinámicas
      const alertas = [];

      // 3.a) Facturación cercana al límite de la categoría (si aplica)
      // En este proyecto la categoría es un código (string); buscamos el límite en tax-category
      if (perfil?.category) {
        const taxCat = await strapi.db
          .query('api::tax-category.tax-category')
          .findOne({ where: { code: perfil.category } });
        const max = taxCat ? Number(taxCat.grossIncomeLimit) : null;
        const est = perfil?.annualRevenue != null ? Number(perfil.annualRevenue) : null;
        if (Number.isFinite(max) && Number.isFinite(est) && max > 0) {
          const ratio = est / max;
          if (ratio >= 0.9) {
            alertas.push({
              tipo: 'categoria',
              mensaje: `Estás alcanzando el límite de tu categoría ${perfil.category}.`,
            });
          }
        }
      }

      // Rango del mes actual para otras alertas de actividad
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

      // 3.b) Gastos sin categorizar
      let egresosSinCategoria = 0;
      try {
        egresosSinCategoria = await strapi.db.query('api::egreso.egreso').count({
          where: { user: userId, categoria: null },
        });
      } catch {
        egresosSinCategoria = 0;
      }
      if (egresosSinCategoria > 0) {
        alertas.push({ tipo: 'egresos', mensaje: 'Tenés gastos sin categorizar.' });
      }

      // 3.c) Gastos sin marcar como deducibles (deducible !== true)
      let egresosNoDeducibles = 0;
      try {
        egresosNoDeducibles = await strapi.db.query('api::egreso.egreso').count({
          where: { user: userId, deducible: { $ne: true } },
        });
      } catch {
        egresosNoDeducibles = 0;
      }
      if (egresosNoDeducibles > 0) {
        alertas.push({ tipo: 'egresos', mensaje: 'Tenés gastos sin marcar como deducibles.' });
      }

      // 3.d) Sin movimientos este mes
      let ingresosMes = 0;
      let egresosMes = 0;
      try {
        ingresosMes = await strapi.db.query('api::ingreso.ingreso').count({
          where: { user: userId, fecha: { $gte: startOfMonth, $lt: startOfNextMonth } },
        });
      } catch {
        ingresosMes = 0;
      }
      try {
        egresosMes = await strapi.db.query('api::egreso.egreso').count({
          where: { user: userId, fecha: { $gte: startOfMonth, $lt: startOfNextMonth } },
        });
      } catch {
        egresosMes = 0;
      }

      if (ingresosMes === 0) {
        alertas.push({ tipo: 'ingresos', mensaje: 'Todavía no cargaste ingresos este mes.' });
      }
      if (egresosMes === 0) {
        alertas.push({ tipo: 'egresos', mensaje: 'Todavía no registraste gastos este mes.' });
      }

      // 4) Respuesta final
      return ctx.send({ vencimientos, alertas });
    } catch (err) {
      strapi.log.error('Error en /dashboard/alerts:', err);
      return ctx.internalServerError('Error al generar alertas');
    }
  },
};

