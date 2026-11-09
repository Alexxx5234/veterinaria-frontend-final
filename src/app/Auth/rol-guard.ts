
/* ==========================================================
   VETERINARIA ARÉVALO
   GUARD DE ROLES

   FUNCIONALIDADES:
   - Comprobar que exista una sesión JWT.
   - Verificar el rol exigido por la ruta.
   - Permitir ADMIN, USER y VETERINARIO.
   - Bloquear rutas de otros roles.
   - Redirigir al dashboard correspondiente.
   ========================================================== */

// ==========================================================
// IMPORTACIONES
// ==========================================================

import {
  inject
} from '@angular/core';

import {
  CanActivateFn,
  Router
} from '@angular/router';

import {
  AuthServicio,
  RolUsuario
} from '../Servicios/auth-servicio';


// ==========================================================
// GUARD FUNCIONAL
// ==========================================================

export const rolGuard: CanActivateFn = (
  route
) => {

  // Servicio de autenticación.
  const authServicio =
    inject(AuthServicio);

  // Navegación Angular.
  const router =
    inject(Router);


  // ========================================================
  // 1. COMPROBAR AUTENTICACIÓN
  // ========================================================

  if (!authServicio.estaAutenticado()) {

    return router.createUrlTree([
      '/login'
    ]);

  }


  // ========================================================
  // 2. OBTENER EL ROL DE LA SESIÓN
  // ========================================================

  const rolUsuario =
    authServicio.obtenerRol();


  // ========================================================
  // 3. OBTENER EL ROL EXIGIDO POR LA RUTA
  // ========================================================

  const rolPermitido =
    route.data['rol'] as RolUsuario | undefined;


  // ========================================================
  // 4. VALIDAR QUE EL ROL SEA CONOCIDO
  // ========================================================

  if (!rolUsuario) {

    return router.createUrlTree([
      '/login'
    ]);

  }


  // ========================================================
  // 5. PERMITIR ACCESO CUANDO COINCIDE EL ROL
  // ========================================================

  /*
    Ejemplos:

    ADMIN accede a /admin/dashboard

    USER accede a /usuario/dashboard

    VETERINARIO accede a /veterinario/dashboard
  */

  if (rolPermitido === rolUsuario) {

    return true;

  }


  // ========================================================
  // 6. BLOQUEAR ACCESO A OTROS ROLES
  // ========================================================

  /*
    Si un USER intenta entrar a ADMIN,
    será redirigido a su propio dashboard.

    Lo mismo ocurre con ADMIN y VETERINARIO.
  */

  const rutaInicio =
    authServicio.obtenerRutaInicio(
      rolUsuario
    );

  return router.parseUrl(
    rutaInicio
  );

};
