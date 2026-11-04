
/* ==========================================================
   VETERINARIA AREVALO
   DASHBOARD ADMINISTRADOR

   - Mantiene el menú lateral.
   - Consulta estadísticas reales desde Spring Boot.
   - Muestra próximas citas y estados de usuarios.
   - Permite actualizar la información.
   ========================================================== */

import {
  Component,
  OnInit,
  ChangeDetectorRef,
  HostListener
} from '@angular/core';

import { CommonModule } from '@angular/common';

import {
  HttpClient,
  HttpHeaders
} from '@angular/common/http';

import { Router } from '@angular/router';

import {
  forkJoin,
  of,
  Observable
} from 'rxjs';

import { catchError } from 'rxjs/operators';

import {
  AuthServicio
} from '../../../Servicios/auth-servicio';


// ==========================================================
// INTERFACES PARA LAS RESPUESTAS DE LA API
// ==========================================================

interface UsuarioResumen {
  estado?: string;
}

interface CitaResumen {
  id?: number;
  fechaHora?: string;
  estado?: string;
  mascota?: {
    nombre?: string;
  };
  servicio?: {
    nombre?: string;
  };
}


// ==========================================================
// COMPONENTE
// ==========================================================

@Component({
  selector: 'app-dashboard-admin',

  standalone: true,

  imports: [CommonModule],

  templateUrl: './dashboard-admin.html',

  styleUrl: './dashboard-admin.scss'
})
export class DashboardAdmin implements OnInit {

  // ========================================================
  // CONFIGURACIÓN DE LA API
  // ========================================================

  private readonly apiUrl = 'http://100.110.172.31:8080/api';


  // ========================================================
  // MENÚ LATERAL
  // ========================================================

  menuAbierto: boolean = false;


  // ========================================================
  // ESTADOS DEL RESUMEN
  // ========================================================

  cargandoResumen: boolean = true;

  errorResumen: boolean = false;


  // ========================================================
  // ESTADÍSTICAS GENERALES
  //
  // null significa que no se pudo consultar.
  // 0 significa que la consulta fue correcta,
  // pero no existen registros.
  // ========================================================

  totalUsuarios: number | null = null;

  totalMascotas: number | null = null;

  totalCitas: number | null = null;

  totalServicios: number | null = null;

  totalVeterinarios: number | null = null;

  usuariosPendientes: number | null = null;

  usuariosAprobados: number | null = null;

  usuariosRechazados: number | null = null;

  usuariosBloqueados: number | null = null;

  citasHoy: number | null = null;


  // ========================================================
  // PRÓXIMAS CITAS
  // ========================================================

  proximasCitas: CitaResumen[] = [];


  // ========================================================
  // CONSTRUCTOR
  // ========================================================

  constructor(
    private router: Router,
    private authServicio: AuthServicio,
    private http: HttpClient,
    private cd: ChangeDetectorRef
  ) {}


  // ========================================================
  // CARGAR LOS DATOS AL ABRIR EL DASHBOARD
  // ========================================================

  ngOnInit(): void {

    this.cargarResumen();

  }


  // ========================================================
  // OBTENER ENCABEZADOS DE AUTENTICACIÓN
  // ========================================================

  private obtenerHeaders(): HttpHeaders {

    // Utiliza el token guardado por la aplicación.
    // Si ya existe un interceptor JWT, también se
    // aplicará normalmente a estas peticiones.
    // Obtener el JWT de la sesión de esta pestaña.
    // Permite mantener ADMIN y USER independientes.
    const token = this.authServicio.obtenerToken();

    let headers = new HttpHeaders();

    if (token) {
      headers = headers.set(
        'Authorization',
        `Bearer ${token}`
      );
    }

    return headers;

  }


  // ========================================================
  // CONSULTAR UNA LISTA DE LA API
  // ========================================================

  private consultarLista<T>(
    ruta: string
  ): Observable<T[] | null> {

    return this.http.get<T[]>(
      `${this.apiUrl}${ruta}`,
      {
        headers: this.obtenerHeaders()
      }
    ).pipe(

      // Si falla una consulta, las demás pueden continuar.
      catchError((error) => {

        console.error(
          `Error consultando ${ruta}:`,
          error
        );

        return of(null);

      })

    );

  }


  // ========================================================
  // CARGAR EL RESUMEN GENERAL
  // ========================================================

  cargarResumen(): void {

    this.cargandoResumen = true;
    this.errorResumen = false;

    // Consultamos los cinco módulos del sistema.
    // Los números se obtienen de los registros reales.
    forkJoin({

      usuarios:
        this.consultarLista<UsuarioResumen>(
          '/admin/usuarios'
        ),

      mascotas:
        this.consultarLista<unknown>(
          '/mascotas'
        ),

      citas:
        this.consultarLista<CitaResumen>(
          '/citas'
        ),

      servicios:
        this.consultarLista<unknown>(
          '/servicios'
        ),

      veterinarios:
        this.consultarLista<unknown>(
          '/veterinarios'
        )

    }).subscribe({

      next: (datos) => {

        // ==================================================
        // TOTALES GENERALES
        // ==================================================

        this.totalUsuarios =
          datos.usuarios?.length ?? null;

        this.totalMascotas =
          datos.mascotas?.length ?? null;

        this.totalCitas =
          datos.citas?.length ?? null;

        this.totalServicios =
          datos.servicios?.length ?? null;

        this.totalVeterinarios =
          datos.veterinarios?.length ?? null;


        // ==================================================
        // RESUMEN DE USUARIOS
        // ==================================================

        if (datos.usuarios !== null) {

          const usuarios = datos.usuarios;

          this.usuariosPendientes = usuarios.filter(
            u => u.estado?.toUpperCase() === 'PENDIENTE'
          ).length;

          this.usuariosAprobados = usuarios.filter(
            u => u.estado?.toUpperCase() === 'APROBADA'
          ).length;

          this.usuariosRechazados = usuarios.filter(
            u => u.estado?.toUpperCase() === 'RECHAZADA'
          ).length;

          this.usuariosBloqueados = usuarios.filter(
            u => u.estado?.toUpperCase() === 'BLOQUEADA'
          ).length;

        } else {

          this.usuariosPendientes = null;
          this.usuariosAprobados = null;
          this.usuariosRechazados = null;
          this.usuariosBloqueados = null;

        }


        // ==================================================
        // RESUMEN DE CITAS
        // ==================================================

        if (datos.citas !== null) {

          const ahora = new Date();

          // Contar citas del día sin incluir canceladas.
          this.citasHoy = datos.citas.filter(cita => {

            if (
              !cita.fechaHora ||
              cita.estado?.toUpperCase() === 'CANCELADA'
            ) {
              return false;
            }

            const fecha = new Date(cita.fechaHora);

            return (
              !isNaN(fecha.getTime()) &&
              fecha.toDateString() === ahora.toDateString()
            );

          }).length;


          // Ordenar las próximas citas por fecha.
          this.proximasCitas = datos.citas

            .filter(cita => {

              if (
                !cita.fechaHora ||
                cita.estado?.toUpperCase() === 'CANCELADA'
              ) {
                return false;
              }

              const fecha = new Date(cita.fechaHora);

              return (
                !isNaN(fecha.getTime()) &&
                fecha.getTime() >= ahora.getTime()
              );

            })

            .sort((a, b) =>
              new Date(a.fechaHora!).getTime() -
              new Date(b.fechaHora!).getTime()
            )

            // Mostrar máximo cuatro citas.
            .slice(0, 4);

        } else {

          this.citasHoy = null;
          this.proximasCitas = [];

        }


        // ==================================================
        // FINALIZAR CARGA
        // ==================================================

        this.errorResumen = [
          datos.usuarios,
          datos.mascotas,
          datos.citas,
          datos.servicios,
          datos.veterinarios
        ].some(resultado => resultado === null);

        this.cargandoResumen = false;

        this.cd.detectChanges();

      },

      error: (error) => {

        console.error(
          'Error general del dashboard:',
          error
        );

        this.cargandoResumen = false;
        this.errorResumen = true;

        this.cd.detectChanges();

      }

    });

  }


  // ========================================================
  // ABRIR Y CERRAR MENÚ
  // ========================================================

  cambiarMenu(): void {

    this.menuAbierto = !this.menuAbierto;

  }

  cerrarMenu(): void {

    this.menuAbierto = false;

  }


  // Cerrar menú móvil al presionar Escape.
  @HostListener('document:keydown.escape')
  cerrarMenuConEscape(): void {

    this.cerrarMenu();

  }


  // ========================================================
  // MÉTODO GENERAL DE NAVEGACIÓN
  // ========================================================

  private navegar(ruta: string): void {

    this.cerrarMenu();

    void this.router.navigateByUrl(ruta);

  }


  // ========================================================
  // RUTAS DEL ADMINISTRADOR
  // ========================================================

  irInicio(): void {
    this.navegar('/admin/dashboard');
  }

  irUsuarios(): void {
    this.navegar('/admin/usuarios');
  }

  irMascotas(): void {
    this.navegar('/admin/mascotas');
  }

  irCitas(): void {
    this.navegar('/admin/citas');
  }

  irServicios(): void {
    this.navegar('/admin/servicios');
  }

  irVeterinarios(): void {
    this.navegar('/admin/veterinarios');
  }


  // ========================================================
  // CERRAR SESIÓN
  // ========================================================

  cerrarSesion(): void {

    this.cerrarMenu();

    this.authServicio.cerrarSesion();

    void this.router.navigateByUrl('/login');

  }

}
