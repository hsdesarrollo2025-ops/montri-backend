'use strict';

module.exports = {
  async find(ctx) {
    try {
      const user = ctx.state?.user;
      if (!user) return ctx.unauthorized('Usuario no autenticado');

      const all = await strapi.db.query('api::egreso.egreso').findMany({
        where: { usuario: user.id },
        orderBy: { fecha: 'desc' },
        select: ['id', 'descripcion', 'fecha', 'monto'],
      });

      const toNumber = (v) => {
        const n = Number(v);
        return Number.isFinite(n) ? n : 0;
      };

      const now = new Date();
      const currentMonth = (all || []).filter((e) => {
        const d = new Date(e.fecha);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      });

      const totalMes = currentMonth.reduce((acc, e) => acc + toNumber(e.monto), 0);

      const semanal = [1, 2, 3, 4].map((sem) => ({
        semana: sem,
        monto: currentMonth
          .filter((e) => Math.ceil(new Date(e.fecha).getDate() / 7) === sem)
          .reduce((acc, e) => acc + toNumber(e.monto), 0),
      }));

      const ultimos = (all || []).slice(0, 5).map((e) => ({
        id: e.id,
        descripcion: e.descripcion,
        fecha: new Date(e.fecha).toISOString().slice(0, 10),
        monto: toNumber(e.monto),
      }));

      return ctx.send({ totalMes, semanal, ultimos });
    } catch (err) {
      strapi.log.error('Error en /egresos/summary:', err);
      return ctx.internalServerError('Error al generar resumen');
    }
  },
};

