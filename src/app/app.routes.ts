
/* ==========================================================
   VETERINARIA ARÉVALO
   CONFIGURACIÓN PRINCIPAL DE RUTAS

   ROLES:
   - USER
   - ADMIN
   - VETERINARIO

   NUEVAS FUNCIONALIDADES:
   - USER: Mis Atenciones Médicas.
   - USER: Mis Facturas.
   - Conserva los módulos administrativos.
   - Conserva los módulos del veterinario.
   - Mantiene authGuard y rolGuard.

   SEGURIDAD:
   El backend debe validar los permisos sobre cada
   mascota, atención y factura.
========================================================== */

import { Routes } from '@angular/router';

// ==========================================================
// PÁGINAS PÚBLICAS
// ==========================================================

import { LoginCompents }
  from './Paginas/publicas/login-compents/login-compents';

import { Registro }
  from './Paginas/publicas/registro/registro';

import { VerificarCodigo }
  from './Paginas/publicas/verificar-codigo/verificar-codigo';

import { LayoutPublico }
  from './Layouts/layout-publico/layout-publico';

// ==========================================================
// PÁGINAS USER
// ==========================================================

import { DashboardUsuario }
  from './Paginas/privadas/dashboard-usuario/dashboard-usuario';

import { Mascotas }
  from './Paginas/privadas/mascotas/mascotas';

import { Citas }
  from './Paginas/privadas/citas/citas';

import { Servicios }
  from './Paginas/privadas/servicios/servicios';

import { Veterinarios }
  from './Paginas/privadas/veterinarios/veterinarios';

// ==========================================================
// PÁGINAS ADMIN
// ==========================================================

import { DashboardAdmin }
  from './Paginas/privadas/dashboard-admin/dashboard-admin';

import { AdminUsuarios }
  from './Paginas/privadas/admin-usuarios/admin-usuarios';

import { AdminMascotas }
  from './Paginas/privadas/admin-mascotas/admin-mascotas';

import { AdminCitas }
  from './Paginas/privadas/admin-citas/admin-citas';

import { AdminAtenciones }
  from './Paginas/privadas/admin-atenciones/admin-atenciones';

import { AdminServicios }
  from './Paginas/privadas/admin-servicios/admin-servicios';

import { AdminVeterinarios }
  from './Paginas/privadas/admin-veterinarios/admin-veterinarios';

import { AdminMedicamentos }
  from './Paginas/privadas/admin-medicamentos/admin-medicamentos';

import { FacturasAdmin }
  from './Paginas/privadas/facturas-admin/facturas-admin';

// ==========================================================
// DASHBOARD VETERINARIO
// ==========================================================

import { DashboardVeterinario }
  from './Paginas/privadas/dashboard-veterinario/dashboard-veterinario';

// ==========================================================
// LAYOUT PRIVADO Y GUARDS
// ==========================================================

import { LayoutPrivado }
  from './Layouts/layout-privado/layout-privado';

import { authGuard }
  from './Auth/auth-guard';

import { rolGuard }
  from './Auth/rol-guard';

// ==========================================================
// RUTAS
// ==========================================================

export const routes: Routes = [

  // RUTA PRINCIPAL.
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },

  // ========================================================
  // PÚBLICAS
  // ========================================================

  {
    path: '',
    component: LayoutPublico,

    children: [
      {
        path: 'login',
        component: LoginCompents
      },
      {
        path: 'registro',
        component: Registro
      },
      {
        path: 'verificar-codigo',
        component: VerificarCodigo
      }
    ]
  },

  // ========================================================
  // USER - CLIENTE
  // ========================================================

  {
    path: 'usuario',
    component: LayoutPrivado,

    canActivate: [
      authGuard,
      rolGuard
    ],

    data: {
      rol: 'USER'
    },

    children: [

      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },

      // Inicio del cliente.
      {
        path: 'dashboard',
        component: DashboardUsuario
      },

      // Registro y edición de mascotas.
      {
        path: 'mascotas',
        component: Mascotas
      },

      // Citas del propietario.
      {
        path: 'citas',
        component: Citas
      },

      // Catálogo de servicios.
      {
        path: 'servicios',
        component: Servicios
      },

      // Profesionales disponibles.
      {
        path: 'veterinarios',
        component: Veterinarios
      },

      // NUEVO: Historial clínico de sus mascotas.
      {
        path: 'atenciones',
        loadComponent: () =>
          import(
            './Paginas/privadas/atenciones-usuario/atenciones-usuario'
          ).then(
            modulo => modulo.AtencionesUsuario
          )
      },

      // NUEVO: Facturas correspondientes al cliente.
      {
        path: 'facturas',
        loadComponent: () =>
          import(
            './Paginas/privadas/facturas-usuario/facturas-usuario'
          ).then(
            modulo => modulo.FacturasUsuario
          )
      }

    ]
  },

  // ========================================================
  // ADMIN - ADMINISTRACIÓN COMPLETA
  // ========================================================

  {
    path: 'admin',
    component: LayoutPrivado,

    canActivate: [
      authGuard,
      rolGuard
    ],

    data: {
      rol: 'ADMIN'
    },

    children: [

      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },

      {
        path: 'dashboard',
        component: DashboardAdmin
      },

      {
        path: 'usuarios',
        component: AdminUsuarios
      },

      {
        path: 'mascotas',
        component: AdminMascotas
      },

      {
        path: 'citas',
        component: AdminCitas
      },

      {
        path: 'atenciones',
        component: AdminAtenciones
      },

      {
        path: 'servicios',
        component: AdminServicios
      },

      {
        path: 'veterinarios',
        component: AdminVeterinarios
      },

      {
        path: 'medicamentos',
        component: AdminMedicamentos
      },

      {
        path: 'facturas',
        component: FacturasAdmin
      }

    ]
  },

  // ========================================================
  // VETERINARIO - ESPACIO PROFESIONAL
  // ========================================================

  {
    path: 'veterinario',
    component: LayoutPrivado,

    canActivate: [
      authGuard,
      rolGuard
    ],

    data: {
      rol: 'VETERINARIO'
    },

    children: [

      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },

      {
        path: 'dashboard',
        component: DashboardVeterinario
      },

      {
        path: 'citas',
        loadComponent: () =>
          import(
            './Paginas/privadas/citas-veterinario/citas-veterinario'
          ).then(
            modulo => modulo.CitasVeterinario
          )
      },

      {
        path: 'atenciones',
        loadComponent: () =>
          import(
            './Paginas/privadas/atenciones-veterinario/atenciones-veterinario'
          ).then(
            modulo => modulo.AtencionesVeterinario
          )
      },

      // Catálogo de medicamentos: solo consulta.
      {
        path: 'medicamentos',
        loadComponent: () =>
          import(
            './Paginas/privadas/medicamentos-disponibles-veterinario/medicamentos-disponibles-veterinario'
          ).then(
            modulo => modulo.MedicamentosDisponiblesVeterinario
          )
      },

      // Registro de medicamentos en una atención.
      {
        path: 'medicamentos-atencion',
        loadComponent: () =>
          import(
            './Paginas/privadas/medicamentos-atencion-veterinario/medicamentos-atencion-veterinario'
          ).then(
            modulo => modulo.MedicamentosAtencionVeterinario
          )
      },

      // Facturas del profesional.
      {
        path: 'facturas',
        loadComponent: () =>
          import(
            './Paginas/privadas/facturas-veterinario/facturas-veterinario'
          ).then(
            modulo => modulo.FacturasVeterinario
          )
      }

    ]
  },

  // RUTAS NO ENCONTRADAS.
  {
    path: '**',
    redirectTo: 'login'
  }

];
