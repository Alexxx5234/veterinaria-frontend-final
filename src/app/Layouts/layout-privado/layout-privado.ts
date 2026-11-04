
/* ==========================================================
   VETERINARIA AREVALO
   LAYOUT PRIVADO COMPARTIDO

   FUNCIONES:
   - Menú para ADMIN y USER.
   - Navegación mediante Angular Router.
   - Menú desplegable para celulares.
   - Notificaciones globales.
   - Integración con PanelAccesibilidad.
   - Cierre de sesión.

   IMPORTANTE:
   La configuración visual antigua se eliminó.
   El nuevo componente de accesibilidad controla
   los contrastes, la lectura de voz y los ajustes.
   ========================================================== */


// ==========================================================
// IMPORTACIONES ANGULAR
// ==========================================================

import {
  Component,
  OnInit,
  OnDestroy,
  HostListener,
  ViewEncapsulation
} from '@angular/core';

import { CommonModule } from '@angular/common';

// Herramientas de navegación Angular.
import {
  ActivatedRoute,
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
  NavigationEnd
} from '@angular/router';

// Permite liberar las suscripciones.
import { Subscription } from 'rxjs';


// ==========================================================
// SERVICIOS EXISTENTES
// ==========================================================

// Autenticación y cierre de sesión.
import { AuthServicio }
  from '../../Servicios/auth-servicio';

// Notificaciones compartidas.
import {
  NotificacionesServicio,
  AvisoSistema
} from '../../Servicios/notificaciones-servicio';


// ==========================================================
// NUEVO COMPONENTE DE ACCESIBILIDAD
// ==========================================================

import { PanelAccesibilidad }
  from '../../Shared/panel-accesibilidad/panel-accesibilidad';


// ==========================================================
// INTERFAZ PARA OPCIONES DEL MENÚ
// ==========================================================

interface OpcionMenu {

  nombre: string;

  icono: string;

  ruta: string;

}


// ==========================================================
// COMPONENTE LAYOUT PRIVADO
// ==========================================================

@Component({

  selector: 'app-layout-privado',

  standalone: true,

  // Directivas y componentes usados en el HTML.
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    PanelAccesibilidad
  ],

  templateUrl: './layout-privado.html',

  styleUrl: './layout-privado.scss',

  // Se conserva para mantener el diseño global.
  encapsulation: ViewEncapsulation.None

})
export class LayoutPrivado implements OnInit, OnDestroy {


  // ========================================================
  // ROL ACTUAL
  // ========================================================

  rol: 'ADMIN' | 'USER' = 'USER';


  // ========================================================
  // MENÚ LATERAL
  // ========================================================

  opciones: OpcionMenu[] = [];

  // Controla el menú en pantallas pequeñas.
  menuAbierto: boolean = false;


  // ========================================================
  // NOTIFICACIONES
  // ========================================================

  notificacionesAbiertas: boolean = false;

  avisos: AvisoSistema[] = [];


  // ========================================================
  // SUSCRIPCIONES
  // ========================================================

  private suscripciones = new Subscription();


  // ========================================================
  // CONTADOR DE NOTIFICACIONES PENDIENTES
  // ========================================================

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

    // ======================================================
    // OBTENER EL ROL DESDE LA RUTA
    // ======================================================

    // Mantiene el comportamiento original.
    this.rol =
      this.rutaActiva.snapshot.data['rol'] === 'ADMIN'
        ? 'ADMIN'
        : 'USER';


    // ======================================================
    // MENÚ DEL ADMINISTRADOR
    // ======================================================

    if (this.rol === 'ADMIN') {

      this.opciones = [

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
          nombre: 'Servicios',
          icono: '🩺',
          ruta: '/admin/servicios'
        },

        {
          nombre: 'Veterinarios',
          icono: '👨‍⚕️',
          ruta: '/admin/veterinarios'
        }

      ];

    } else {

      // ====================================================
      // MENÚ DEL USUARIO
      // ====================================================

      this.opciones = [

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
        }

      ];

    }

  }


  // ========================================================
  // INICIAR LAYOUT
  // ========================================================

  ngOnInit(): void {

    // ======================================================
    // RECIBIR NOTIFICACIONES GLOBALES
    // ======================================================

    this.suscripciones.add(

      this.notificacionesServicio.avisos$
        .subscribe(avisos => {

          this.avisos = avisos;

        })

    );


    // ======================================================
    // CERRAR MENÚ CUANDO CAMBIA LA RUTA
    // ======================================================

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
  // ABRIR O CERRAR MENÚ DEL CELULAR
  // ========================================================

  cambiarMenu(): void {

    this.menuAbierto = !this.menuAbierto;

    // Evita mostrar la campana mientras
    // se utiliza el menú móvil.
    this.notificacionesAbiertas = false;

  }


  // ========================================================
  // CERRAR MENÚ Y NOTIFICACIONES
  // ========================================================

  cerrarPaneles(): void {

    this.menuAbierto = false;

    this.notificacionesAbiertas = false;

  }


  // ========================================================
  // CERRAR CON LA TECLA ESCAPE
  // ========================================================

  @HostListener('document:keydown.escape')
  cerrarConEscape(): void {

    this.cerrarPaneles();

    // PanelAccesibilidad también escucha Escape
    // y cierra su propio panel.

  }


  // ========================================================
  // ABRIR O CERRAR NOTIFICACIONES
  // ========================================================

  cambiarNotificaciones(): void {

    this.notificacionesAbiertas =
      !this.notificacionesAbiertas;

    // Marcar como leídas al abrir la campana.
    if (this.notificacionesAbiertas) {

      this.notificacionesServicio.marcarLeidas();

    }

  }


  // ========================================================
  // LIMPIAR NOTIFICACIONES
  // ========================================================

  limpiarNotificaciones(): void {

    this.notificacionesServicio.limpiar();

  }


  // ========================================================
  // CERRAR SESIÓN
  // ========================================================

  cerrarSesion(): void {

    // Cerrar el menú y la campana.
    this.cerrarPaneles();

    // No conservar avisos de la sesión anterior.
    this.notificacionesServicio.limpiar();

    // Mantener el método existente de autenticación.
    this.authServicio.cerrarSesion();

    // Regresar al login.
    void this.router.navigateByUrl('/login');

  }

}
