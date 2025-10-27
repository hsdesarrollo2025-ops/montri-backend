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

      const all = await strapi.db.query('api::ingreso.ingreso').findMany({
        where: { usuario: userId },
        orderBy: { fecha: 'desc' },
        select: ['id', 'descripcion', 'fecha', 'monto'],
      });

      const toNumber = (v) => {
        const n = Number(v);
        return Number.isFinite(n) ? n : 0;
      };

      const now = new Date();
      const currentMonth = (all || []).filter((i) => {
        const d = new Date(i.fecha);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      });

      const totalMes = currentMonth.reduce((acc, i) => acc + toNumber(i.monto), 0);

      const semanal = [1, 2, 3, 4].map((sem) => ({
        semana: sem,
        monto: currentMonth
          .filter((i) => Math.ceil(new Date(i.fecha).getDate() / 7) === sem)
          .reduce((acc, i) => acc + toNumber(i.monto), 0),
      }));

      const ultimos = (all || []).slice(0, 5).map((i) => ({
        id: i.id,
        descripcion: i.descripcion,
        fecha: new Date(i.fecha).toISOString().slice(0, 10),
        monto: toNumber(i.monto),
      }));

      return ctx.send({ totalMes, semanal, ultimos });
    } catch (err) {
      strapi.log.error('Error en /ingresos/summary:', err);
      return ctx.internalServerError('Error al generar resumen');
    }
  },
};
