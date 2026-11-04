
/* ==========================================================
   VETERINARIA AREVALO
   RUTAS PRINCIPALES DE ANGULAR

   FUNCIONALIDADES:
   - Login, Registro y Verificación con accesibilidad.
   - Layout público sin menú lateral.
   - Layout privado para ADMIN y USER.
   - Protección mediante authGuard y rolGuard.
   - Conservación de todas las URL existentes.
   - Redirección al login para rutas desconocidas.

   IMPORTANTE:
   No se modifican los servicios REST ni el JWT.
   ========================================================== */


// ==========================================================
// 1. IMPORTACIONES DE ANGULAR
// ==========================================================

// Define las rutas de navegación de la aplicación.
import { Routes } from '@angular/router';


// ==========================================================
// 2. COMPONENTES PÚBLICOS
// ==========================================================

// Página de inicio de sesión.
import { LoginCompents }
  from './Paginas/publicas/login-compents/login-compents';

// Página de registro de usuarios.
import { Registro }
  from './Paginas/publicas/registro/registro';

// Página de verificación por correo.
import { VerificarCodigo }
  from './Paginas/publicas/verificar-codigo/verificar-codigo';


// ==========================================================
// 3. LAYOUT PÚBLICO - NUEVO
// ==========================================================

// Muestra el panel de accesibilidad en:
// /login, /registro y /verificar-codigo.
import { LayoutPublico }
  from './Layouts/layout-publico/layout-publico';


// ==========================================================
// 4. COMPONENTES PRIVADOS DEL USUARIO
// ==========================================================

// Dashboard del usuario.
import { DashboardUsuario }
  from './Paginas/privadas/dashboard-usuario/dashboard-usuario';

// Mascotas propias del usuario.
import { Mascotas }
  from './Paginas/privadas/mascotas/mascotas';

// Citas del usuario.
import { Citas }
  from './Paginas/privadas/citas/citas';

// Catálogo de servicios.
import { Servicios }
  from './Paginas/privadas/servicios/servicios';

// Catálogo de veterinarios.
import { Veterinarios }
  from './Paginas/privadas/veterinarios/veterinarios';


// ==========================================================
// 5. COMPONENTES PRIVADOS DEL ADMINISTRADOR
// ==========================================================

// Dashboard del administrador.
import { DashboardAdmin }
  from './Paginas/privadas/dashboard-admin/dashboard-admin';

// Administración de usuarios.
import { AdminUsuarios }
  from './Paginas/privadas/admin-usuarios/admin-usuarios';

// Administración de mascotas.
import { AdminMascotas }
  from './Paginas/privadas/admin-mascotas/admin-mascotas';

// Administración de citas.
import { AdminCitas }
  from './Paginas/privadas/admin-citas/admin-citas';

// Administración de servicios.
import { AdminServicios }
  from './Paginas/privadas/admin-servicios/admin-servicios';

// Administración de veterinarios.
import { AdminVeterinarios }
  from './Paginas/privadas/admin-veterinarios/admin-veterinarios';


// ==========================================================
// 6. LAYOUT PRIVADO
// ==========================================================

// Menú lateral, barra superior, notificaciones
// y accesibilidad para ADMIN y USER.
import { LayoutPrivado }
  from './Layouts/layout-privado/layout-privado';


// ==========================================================
// 7. GUARDS DE SEGURIDAD
// ==========================================================

// Comprueba que el usuario tenga una sesión válida.
import { authGuard }
  from './Auth/auth-guard';

// Comprueba que tenga el rol correspondiente.
import { rolGuard }
  from './Auth/rol-guard';


// ==========================================================
// 8. CONFIGURACIÓN DE RUTAS
// ==========================================================

export const routes: Routes = [


  // ========================================================
  // INICIO DE LA APLICACIÓN
  // ========================================================

  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },


  // ========================================================
  // PÁGINAS PÚBLICAS CON ACCESIBILIDAD
  // ========================================================

  /*
    Este LayoutPublico contiene el botón ♿.

    No muestra menú lateral ni requiere JWT.

    Sus componentes hijos conservan los formularios
    y métodos originales de autenticación.
  */

  {
    path: '',

    component: LayoutPublico,

    children: [

      // ----------------------------------------------------
      // LOGIN
      // ----------------------------------------------------
      {
        path: 'login',
        component: LoginCompents
      },


      // ----------------------------------------------------
      // REGISTRO
      // ----------------------------------------------------
      {
        path: 'registro',
        component: Registro
      },


      // ----------------------------------------------------
      // VERIFICACIÓN DE CORREO
      // ----------------------------------------------------
      {
        path: 'verificar-codigo',
        component: VerificarCodigo
      }

    ]
  },


  // ========================================================
  // RUTAS PRIVADAS DEL USUARIO
  // ========================================================

  {
    path: 'usuario',

    // Layout que contiene el menú USER.
    component: LayoutPrivado,

    // Solo usuarios autenticados con rol USER.
    canActivate: [
      authGuard,
      rolGuard
    ],

    data: {
      rol: 'USER'
    },

    children: [

      // Página inicial.
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },


      // Dashboard USER.
      {
        path: 'dashboard',
        component: DashboardUsuario
      },


      // Mascotas del usuario.
      {
        path: 'mascotas',
        component: Mascotas
      },


      // Citas del usuario.
      {
        path: 'citas',
        component: Citas
      },


      // Catálogo de servicios.
      {
        path: 'servicios',
        component: Servicios
      },


      // Catálogo de veterinarios.
      {
        path: 'veterinarios',
        component: Veterinarios
      }

    ]

  },


  // ========================================================
  // RUTAS PRIVADAS DEL ADMINISTRADOR
  // ========================================================

  {
    path: 'admin',

    // Layout que contiene el menú ADMIN.
    component: LayoutPrivado,

    // Solo usuarios autenticados con rol ADMIN.
    canActivate: [
      authGuard,
      rolGuard
    ],

    data: {
      rol: 'ADMIN'
    },

    children: [

      // Página inicial.
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },


      // Dashboard ADMIN.
      {
        path: 'dashboard',
        component: DashboardAdmin
      },


      // Gestión de usuarios.
      {
        path: 'usuarios',
        component: AdminUsuarios
      },


      // Gestión de mascotas.
      {
        path: 'mascotas',
        component: AdminMascotas
      },


      // Gestión de citas.
      {
        path: 'citas',
        component: AdminCitas
      },


      // Gestión de servicios.
      {
        path: 'servicios',
        component: AdminServicios
      },


      // Gestión de veterinarios.
      {
        path: 'veterinarios',
        component: AdminVeterinarios
      }

    ]

  },


  // ========================================================
  // RUTAS DESCONOCIDAS
  // ========================================================

  // Cualquier dirección inexistente vuelve al login.
  {
    path: '**',
    redirectTo: 'login'
  }

];
