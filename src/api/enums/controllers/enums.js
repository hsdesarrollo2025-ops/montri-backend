'use strict';

module.exports = {
  async find(ctx) {
    try {
      const enums = {
        ingresos: {
          categorias: ["Servicios", "Ventas", "Otros"],
          metodo_cobro: ["Efectivo", "Transferencia", "MercadoPago", "Tarjeta"],
        },
        egresos: {
          categorias: ["Transporte", "Oficina", "Servicios", "Otros"],
          metodo_pago: ["Efectivo", "Transferencia", "Tarjeta"],
          deducible: [true, false],
        },
      };

      ctx.body = enums;
    } catch (err) {
      ctx.throw(500, err);
    }
  },
};

