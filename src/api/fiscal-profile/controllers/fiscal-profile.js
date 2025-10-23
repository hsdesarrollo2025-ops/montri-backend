'use strict';

// Helper to extract and verify JWT using users-permissions service
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

const init = async (ctx) => {
  try {
    const userId = await getAuthUserId(ctx);
    if (!userId) return ctx.unauthorized('Usuario no autenticado.');

    const existing = await strapi.db.query('api::fiscal-profile.fiscal-profile').findOne({ where: { user: userId } });
    if (existing) {
      return ctx.conflict('El usuario ya tiene un perfil fiscal creado.');
    }

    const user = await strapi.db.query('plugin::users-permissions.user').findOne({
      where: { id: userId },
      select: ['firstName', 'lastName', 'email', 'cuit'],
    });

    const now = new Date();
    const profile = await strapi.db.query('api::fiscal-profile.fiscal-profile').create({
      data: {
        user: userId,
        status: 'draft',
        completedSection: null,
        progress: 0,
        autosave: false,
        createdDate: now,
        updatedDate: now,
        firstName: user?.firstName || null,
        lastName: user?.lastName || null,
        email: user?.email || null,
        cuit: user?.cuit || null,
      },
    });

    ctx.send({ message: 'Perfil fiscal inicializado correctamente.', profile });
  } catch (error) {
    strapi.log.error('Error al inicializar fiscal-profile:', error);
    ctx.internalServerError('Ocurrió un error al crear el perfil fiscal.');
  }
};

const updateSectionA = async (ctx) => {
  try {
    const userId = await getAuthUserId(ctx);
    if (!userId) return ctx.unauthorized('Usuario no autenticado.');

    const profile = await strapi.db.query('api::fiscal-profile.fiscal-profile').findOne({ where: { user: userId } });
    if (!profile) return ctx.notFound('No se encontró el perfil fiscal del usuario.');

    const data = ctx.request.body || {};
    const errors = [];

    if (!data.firstName || data.firstName.length < 2) errors.push('El nombre debe tener al menos 2 caracteres.');
    if (!data.lastName || data.lastName.length < 2) errors.push('El apellido debe tener al menos 2 caracteres.');
    if (!['DNI', 'Pasaporte', 'Otro'].includes(data.documentType)) errors.push('Tipo de documento inválido.');
    if (!/^[0-9]{7,10}$/.test(data.documentNumber || '')) errors.push('El número de documento debe tener entre 7 y 10 dígitos.');
    if (!/^[0-9]{11}$/.test(data.cuit || '')) errors.push('El CUIT debe tener 11 dígitos numéricos.');

    const validateCuit = (cuit) => {
      const nums = cuit.split('').map(Number);
      const coef = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
      const suma = coef.reduce((acc, val, i) => acc + val * nums[i], 0);
      const resto = suma % 11;
      const verificador = resto === 0 ? 0 : resto === 1 ? 9 : 11 - resto;
      return verificador === nums[10];
    };
    if (data.cuit && !validateCuit(data.cuit)) errors.push('El CUIT ingresado no es válido.');

    if (!data.addressStreet) errors.push('El campo domicilioCalle es obligatorio.');
    if (!data.addressNumber) errors.push('El campo domicilioNumero es obligatorio.');
    if (!data.city) errors.push('El campo localidad es obligatorio.');
    if (!data.province) errors.push('Debe seleccionar una provincia.');
    if (!/^[0-9]{4,5}$/.test(data.postalCode || '')) errors.push('Código postal inválido (4-5 dígitos).');
    if (!/^[^@]+@[^@]+\.[a-zA-Z]{2,}$/.test(data.email || '')) errors.push('Email con formato inválido.');
    if (data.phone && !/^[0-9]{8,15}$/.test(data.phone)) errors.push('El teléfono debe tener entre 8 y 15 dígitos.');

    if (errors.length > 0) return ctx.unprocessableEntity({ errores: errors });

    const updated = await strapi.db.query('api::fiscal-profile.fiscal-profile').update({
      where: { id: profile.id },
      data: {
        ...data,
        completedSection: 'A',
        progress: 33,
        updatedDate: new Date(),
      },
    });

    ctx.send({ message: 'Sección A guardada correctamente.', profile: updated });
  } catch (error) {
    strapi.log.error('Error al guardar Sección A (fiscal-profile):', error);
    ctx.internalServerError('Ocurrió un error al guardar la sección.');
  }
};

const getByUser = async (ctx) => {
  try {
    const authUserId = await getAuthUserId(ctx);
    if (!authUserId) return ctx.unauthorized('Usuario no autenticado.');

    const { userId } = ctx.params;
    if (String(authUserId) !== String(userId)) return ctx.forbidden('No autorizado.');

    const profile = await strapi.db.query('api::fiscal-profile.fiscal-profile').findOne({ where: { user: userId } });
    if (!profile) return ctx.notFound('No se encontró el perfil fiscal del usuario.');

    ctx.send({ profile });
  } catch (error) {
    strapi.log.error('Error al obtener perfil por usuario:', error);
    ctx.internalServerError('Ocurrió un error al obtener el perfil.');
  }
};

const finalize = async (ctx) => {
  try {
    const userId = await getAuthUserId(ctx);
    if (!userId) return ctx.unauthorized('Usuario no autenticado.');

    const profile = await strapi.db.query('api::fiscal-profile.fiscal-profile').findOne({ where: { user: userId } });
    if (!profile) return ctx.notFound('No se encontró el perfil fiscal del usuario.');

    const updated = await strapi.db.query('api::fiscal-profile.fiscal-profile').update({
      where: { id: profile.id },
      data: { status: 'complete', progress: 100, updatedDate: new Date() },
    });
    ctx.send({ message: 'Perfil fiscal finalizado correctamente.', profile: updated });
  } catch (error) {
    strapi.log.error('Error al finalizar perfil fiscal:', error);
    ctx.internalServerError('Ocurrió un error al finalizar el perfil.');
  }
};

const validateCuit = async (ctx) => {
  const { cuit } = ctx.params;
  const valid = /^[0-9]{11}$/.test(cuit || '') && (function () {
    const nums = cuit.split('').map(Number);
    const coef = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
    const suma = coef.reduce((acc, val, i) => acc + val * nums[i], 0);
    const resto = suma % 11;
    const verificador = resto === 0 ? 0 : resto === 1 ? 9 : 11 - resto;
    return verificador === nums[10];
  })();
  if (!valid) return ctx.badRequest('El CUIT ingresado no es válido.');
  ctx.send({ message: 'CUIT válido.' });
};

const validateCategory = async (ctx) => {
  // Placeholder de validación (falta especificación). Devuelve 200 con mensaje.
  ctx.send({ message: 'Validación de categoría no implementada aún.' });
};

const getFiscalProfile = async (ctx) => {
  try {
    const { userId } = ctx.params || {};
    if (!userId) return ctx.badRequest('Debe especificar el ID de usuario.');

    const authUserId = await getAuthUserId(ctx);
    if (!authUserId) return ctx.unauthorized('Usuario no autenticado.');
    if (String(authUserId) !== String(userId)) return ctx.forbidden('No autorizado.');

    const profile = await strapi.db
      .query('api::fiscal-profile.fiscal-profile')
      .findOne({ where: { user: userId }, populate: true });

    if (!profile) return ctx.notFound('El usuario no tiene un perfil fiscal creado.');

    ctx.send({ message: 'Perfil fiscal obtenido correctamente.', profile });
  } catch (error) {
    strapi.log.error('Error al obtener perfil fiscal:', error);
    ctx.internalServerError('Ocurrió un error al obtener el perfil fiscal.');
  }
};

const updateSectionC = async (ctx) => {
  try {
    const userId = await getAuthUserId(ctx);
    if (!userId) return ctx.unauthorized('Usuario no autenticado.');

    const profile = await strapi.db
      .query('api::fiscal-profile.fiscal-profile')
      .findOne({ where: { user: userId } });
    if (!profile) return ctx.notFound('No se encontró el perfil fiscal del usuario.');

    const data = ctx.request.body || {};
    const errors = [];

    if (typeof data.acceptsAccuracy !== 'boolean' || data.acceptsAccuracy === false)
      errors.push('Debes confirmar que los datos son verídicos.');
    if (typeof data.acceptsTerms !== 'boolean' || data.acceptsTerms === false)
      errors.push('Debes aceptar los términos y condiciones.');
    if (data.notes && data.notes.length > 255)
      errors.push('El campo de observaciones no puede superar los 255 caracteres.');

    if (errors.length > 0) return ctx.unprocessableEntity({ errores: errors });

    const updated = await strapi.db
      .query('api::fiscal-profile.fiscal-profile')
      .update({
        where: { id: profile.id },
        data: {
          acceptsAccuracy: data.acceptsAccuracy,
          acceptsTerms: data.acceptsTerms,
          notes: data.notes || null,
          completedSection: 'C',
          progress: 100,
          status: 'complete',
          updatedDate: new Date(),
        },
      });

    ctx.send({
      message: 'Sección C guardada correctamente. Perfil fiscal completado.',
      profile: updated,
    });
  } catch (error) {
    strapi.log.error('Error al guardar Sección C:', error);
    ctx.internalServerError('Ocurrió un error al guardar la sección.');
  }
};

const validateFiscalProfileStatus = async (ctx) => {
  try {
    const userId = await getAuthUserId(ctx);
    if (!userId) return ctx.unauthorized('Usuario no autenticado.');

    const profile = await strapi.db
      .query('api::fiscal-profile.fiscal-profile')
      .findOne({ where: { user: userId }, select: ['id', 'status', 'completedSection', 'progress'] });

    if (!profile) {
      return ctx.send({
        hasProfile: false,
        message: 'El usuario no tiene un perfil fiscal creado.',
        status: 'none',
        completedSection: null,
        nextSection: 'A',
      });
    }

    let nextSection = null;
    if (profile.status !== 'complete') {
      if (profile.completedSection === null) nextSection = 'A';
      else if (profile.completedSection === 'A') nextSection = 'B';
      else if (profile.completedSection === 'B') nextSection = 'C';
    }

    ctx.send({
      hasProfile: true,
      status: profile.status,
      completedSection: profile.completedSection,
      nextSection,
      progress: profile.progress,
      message:
        profile.status === 'complete'
          ? 'El perfil fiscal está completo.'
          : `El perfil fiscal está en progreso. Falta completar la sección ${nextSection}.`,
    });
  } catch (error) {
    strapi.log.error('Error al validar estado del perfil fiscal:', error);
    ctx.internalServerError('Ocurrió un error al validar el estado del perfil fiscal.');
  }
};

module.exports = {
  init,
  updateSectionA,
  updateSectionC,
  async me(ctx) {
    try {
      const authUserId = ctx.state?.user?.id || (await getAuthUserId(ctx));
      if (!authUserId) return ctx.unauthorized('No autenticado');

      const profile = await strapi.db
        .query('api::fiscal-profile.fiscal-profile')
        .findOne({ where: { user: authUserId } });

      if (!profile) return ctx.notFound('Perfil fiscal no encontrado');

      return ctx.send({ message: 'Perfil fiscal obtenido correctamente.', profile });
    } catch (error) {
      strapi.log.error('Error en endpoint /fiscal-profile/me:', error);
      return ctx.internalServerError('Ocurrió un error al obtener el perfil fiscal.');
    }
  },
  async updateSectionB(ctx) {
    try {
      const userId = await getAuthUserId(ctx);
      if (!userId) return ctx.unauthorized('Usuario no autenticado.');

      const profile = await strapi.db
        .query('api::fiscal-profile.fiscal-profile')
        .findOne({ where: { user: userId } });
      if (!profile) return ctx.notFound('No se encontró el perfil fiscal del usuario.');

      const data = ctx.request.body || {};
      const errors = [];

      // Validaciones base
      if (!['Monotributista', 'Responsible Inscripto'].includes(data.regime))
        errors.push('El régimen fiscal es inválido.');

      if (!data.startDate) errors.push('La fecha de alta es obligatoria.');
      else if (new Date(data.startDate) > new Date())
        errors.push('La fecha de alta no puede ser futura.');

      const revenueNumber = Number(data.annualRevenue);
      if (!Number.isFinite(revenueNumber) || revenueNumber <= 0)
        errors.push('La facturación anual estimada debe ser mayor que 0.');

      if (!data.mainActivity) errors.push('Debe indicar la actividad principal.');
      if (!data.activityProvince) errors.push('Debe seleccionar la provincia de actividad.');
      if (!['Final Consumer', 'Registered Taxpayer', 'Mixed'].includes(data.clientType))
        errors.push('El tipo de clientes es inválido.');
      if (data.monthlyOperations != null && Number(data.monthlyOperations) < 0)
        errors.push('Las operaciones mensuales no pueden ser negativas.');

      // Validaciones específicas por régimen
      if (data.regime === 'Monotributista') {
        if (!data.category) {
          errors.push('Debe seleccionar la categoría fiscal.');
        } else {
          const category = await strapi.db
            .query('api::tax-category.tax-category')
            .findOne({ where: { code: data.category } });

          if (!category) {
            errors.push(`La categoría ${data.category} no existe en la tabla AFIP.`);
          } else {
            const limit = Number(category.grossIncomeLimit);
            if (revenueNumber > limit) {
              errors.push(`La facturación estimada excede el límite permitido para la categoría ${data.category}.`);
            }

            const maxCategory = await strapi.db
              .query('api::tax-category.tax-category')
              .findOne({ where: { code: 'K' } });
            if (maxCategory && revenueNumber > Number(maxCategory.grossIncomeLimit)) {
              errors.push('Tu facturación estimada supera el máximo permitido para el Monotributo. Deberías seleccionar Responsable Inscripto.');
            }
          }
        }
      }

      if (data.regime === 'Responsible Inscripto' && data.category) {
        delete data.category; // No aplica categoría para este régimen
      }

      if (errors.length > 0) return ctx.unprocessableEntity({ errores: errors });

      const updated = await strapi.db
        .query('api::fiscal-profile.fiscal-profile')
        .update({
          where: { id: profile.id },
          data: {
            regime: data.regime,
            startDate: data.startDate,
            mainActivity: data.mainActivity,
            activityProvince: data.activityProvince,
            clientType: data.clientType,
            monthlyOperations: data.monthlyOperations,
            hasEmployees: data.hasEmployees,
            category: data.category,
            annualRevenue: revenueNumber,
            completedSection: 'B',
            progress: 66,
            updatedDate: new Date(),
          },
        });

      ctx.send({ message: 'Sección B guardada correctamente.', profile: updated });
    } catch (error) {
      strapi.log.error('Error al guardar Sección B:', error);
      ctx.internalServerError('Ocurrió un error al guardar la sección.');
    }
  },
  getByUser,
  finalize,
  validateCuit,
  validateCategory,
  getFiscalProfile,
  validateFiscalProfileStatus,
};
