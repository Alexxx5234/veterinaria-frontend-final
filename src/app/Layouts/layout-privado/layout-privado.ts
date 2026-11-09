
/* ==========================================================
   VETERINARIA ARÉVALO
   LAYOUT PRIVADO PARA LOS TRES ROLES

   FUNCIONALIDADES:
   1. Menú por rol.
   2. Navegación móvil.
   3. Notificaciones globales.
   4. Accesibilidad compartida.
   5. Cierre de sesión JWT.
   6. Acceso a Mis Atenciones y Mis Facturas para USER.

   Mantiene layout-privado.html y layout-privado.scss.
========================================================== */

import {
  Component,
  OnInit,
  OnDestroy,
  HostListener,
  ViewEncapsulation
} from '@angular/core';

import { CommonModule } from '@angular/common';

import {
  ActivatedRoute,
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
  NavigationEnd
} from '@angular/router';

import { Subscription } from 'rxjs';

import {
  AuthServicio,
  RolUsuario
} from '../../Servicios/auth-servicio';

import {
  NotificacionesServicio,
  AvisoSistema
} from '../../Servicios/notificaciones-servicio';

import { PanelAccesibilidad }
  from '../../Shared/panel-accesibilidad/panel-accesibilidad';

// ==========================================================
// ESTRUCTURA DE LAS OPCIONES DEL MENÚ
// ==========================================================

interface OpcionMenu {
  nombre: string;
  icono: string;
  ruta: string;
}

// ==========================================================
// COMPONENTE
// ==========================================================

@Component({
  selector: 'app-layout-privado',
  standalone: true,

  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    PanelAccesibilidad
  ],

  templateUrl: './layout-privado.html',
  styleUrl: './layout-privado.scss',

  encapsulation: ViewEncapsulation.None
})
export class LayoutPrivado implements OnInit, OnDestroy {

  // Rol identificado desde las rutas protegidas.
  rol: RolUsuario = 'USER';

  opciones: OpcionMenu[] = [];

  // Estados visuales del layout.
  menuAbierto = false;
  notificacionesAbiertas = false;

  // Avisos globales.
  avisos: AvisoSistema[] = [];

  private suscripciones = new Subscription();

  // ========================================================
  // INFORMACIÓN DEL PERFIL
  // ========================================================

  get nombreRol(): string {
    switch (this.rol) {
      case 'ADMIN':
        return 'Administrador';

      case 'VETERINARIO':
        return 'Veterinario';

      default:
        return 'Mi cuenta';
    }
  }

  get descripcionRol(): string {
    switch (this.rol) {
      case 'ADMIN':
        return 'Panel de administración';

      case 'VETERINARIO':
        return 'Espacio profesional';

      default:
        return 'Mi espacio personal';
    }
  }

  get iconoRol(): string {
    switch (this.rol) {
      case 'ADMIN':
        return '👨‍💼';

      case 'VETERINARIO':
        return '🩺';

      default:
        return '👤';
    }
  }

  get avisosNoLeidos(): number {
    return this.avisos.filter(
      aviso => !aviso.leida
    ).length;
  }

  // ========================================================
  // CONSTRUCTOR
  // ========================================================

  constructor(
    private rutaActiva: ActivatedRoute,
    private router: Router,
    private authServicio: AuthServicio,
    private notificacionesServicio: NotificacionesServicio
  ) {
    // El guard verifica el acceso según el rol real.
    const rolRuta = this.rutaActiva.snapshot.data['rol'];

    if (
      rolRuta === 'ADMIN' ||
      rolRuta === 'USER' ||
      rolRuta === 'VETERINARIO'
    ) {
      this.rol = rolRuta;
    }

    this.opciones = this.crearOpcionesMenu();
  }

  // ========================================================
  // CREAR MENÚ POR ROL
  // ========================================================

  private crearOpcionesMenu(): OpcionMenu[] {

    // ------------------------------------------------------
    // ADMINISTRADOR
    // ------------------------------------------------------

    if (this.rol === 'ADMIN') {
      return [
        {
          nombre: 'Inicio',
          icono: '🏠',
          ruta: '/admin/dashboard'
        },
        {
          nombre: 'Usuarios',
          icono: '👥',
          ruta: '/admin/usuarios'
        },
        {
          nombre: 'Mascotas',
          icono: '🐾',
          ruta: '/admin/mascotas'
        },
        {
          nombre: 'Citas',
          icono: '📅',
          ruta: '/admin/citas'
        },
        {
          nombre: 'Atenciones Médicas',
          icono: '🩺',
          ruta: '/admin/atenciones'
        },
        {
          nombre: 'Servicios',
          icono: '🩺',
          ruta: '/admin/servicios'
        },
        {
          nombre: 'Veterinarios',
          icono: '👨‍⚕️',
          ruta: '/admin/veterinarios'
        },
        {
          nombre: 'Medicamentos',
          icono: '💊',
          ruta: '/admin/medicamentos'
        },
        {
          nombre: 'Facturas',
          icono: '🧾',
          ruta: '/admin/facturas'
        }
      ];
    }

    // ------------------------------------------------------
    // VETERINARIO
    // ------------------------------------------------------

    if (this.rol === 'VETERINARIO') {
      return [
        {
          nombre: 'Inicio',
          icono: '🏠',
          ruta: '/veterinario/dashboard'
        },
        {
          nombre: 'Mis Citas',
          icono: '📅',
          ruta: '/veterinario/citas'
        },
        {
          nombre: 'Atenciones Médicas',
          icono: '🩺',
          ruta: '/veterinario/atenciones'
        },
        {
          nombre: 'Medicamentos disponibles',
          icono: '💊',
          ruta: '/veterinario/medicamentos'
        },
        {
          nombre: 'Medicamentos de la atención',
          icono: '🩺',
          ruta: '/veterinario/medicamentos-atencion'
        },
        {
          nombre: 'Facturas',
          icono: '🧾',
          ruta: '/veterinario/facturas'
        }
      ];
    }

    // ------------------------------------------------------
    // USER - CLIENTE
    // ------------------------------------------------------
    //
    // No se incluye catálogo ni inventario de medicamentos.
    // Solo se muestran sus atenciones y facturas.
    // ------------------------------------------------------

    return [
      {
        nombre: 'Inicio',
        icono: '🏠',
        ruta: '/usuario/dashboard'
      },
      {
        nombre: 'Mis Mascotas',
        icono: '🐾',
        ruta: '/usuario/mascotas'
      },
      {
        nombre: 'Mis Citas',
        icono: '📅',
        ruta: '/usuario/citas'
      },
      {
        nombre: 'Servicios',
        icono: '🩺',
        ruta: '/usuario/servicios'
      },
      {
        nombre: 'Veterinarios',
        icono: '👨‍⚕️',
        ruta: '/usuario/veterinarios'
      },

      // NUEVO: historial clínico del propietario.
      {
        nombre: 'Mis Atenciones Médicas',
        icono: '🩺',
        ruta: '/usuario/atenciones'
      },

      // NUEVO: consulta y descarga de comprobantes.
      {
        nombre: 'Mis Facturas',
        icono: '🧾',
        ruta: '/usuario/facturas'
      }
    ];
  }

  // ========================================================
  // INICIAR LAYOUT
  // ========================================================

  ngOnInit(): void {

    // Recibir notificaciones globales.
    this.suscripciones.add(
      this.notificacionesServicio.avisos$
        .subscribe(avisos => {
          this.avisos = avisos;
        })
    );

    // Cerrar paneles al navegar entre páginas.
    this.suscripciones.add(
      this.router.events.subscribe(evento => {
        if (evento instanceof NavigationEnd) {
          this.cerrarPaneles();
        }
      })
    );
  }

  // ========================================================
  // LIBERAR SUSCRIPCIONES
  // ========================================================

  ngOnDestroy(): void {
    this.suscripciones.unsubscribe();
  }

  // ========================================================
  // MENÚ RESPONSIVO
  // ========================================================

  cambiarMenu(): void {
    this.menuAbierto = !this.menuAbierto;
    this.notificacionesAbiertas = false;
  }

  cerrarPaneles(): void {
    this.menuAbierto = false;
    this.notificacionesAbiertas = false;
  }

  // Permite cerrar paneles desde el teclado.
  @HostListener('document:keydown.escape')
  cerrarConEscape(): void {
    this.cerrarPaneles();
  }

  // ========================================================
  // NOTIFICACIONES
  // ========================================================

  cambiarNotificaciones(): void {
    this.notificacionesAbiertas =
      !this.notificacionesAbiertas;

    this.menuAbierto = false;

    if (this.notificacionesAbiertas) {
      this.notificacionesServicio.marcarLeidas();
    }
  }

  limpiarNotificaciones(): void {
    this.notificacionesServicio.limpiar();
  }

  // ========================================================
  // CIERRE DE SESIÓN
  // ========================================================

  cerrarSesion(): void {
    this.cerrarPaneles();
    this.notificacionesServicio.limpiar();
    this.authServicio.cerrarSesion();

    void this.router.navigateByUrl('/login');
  }
}
