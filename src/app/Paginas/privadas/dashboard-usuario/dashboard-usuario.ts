
/* ==========================================================
   VETERINARIA AREVALO
   DASHBOARD DEL USUARIO

   FUNCIONALIDADES:
   - Menú lateral y menú para celulares.
   - Estadísticas personales obtenidas de Spring Boot.
   - Próximas citas del usuario autenticado.
   - Mascotas registradas por el usuario.
   - Navegación y cierre de sesión JWT.
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
// DATOS DE LAS MASCOTAS
// ==========================================================

interface MascotaResumen {
  id?: number;
  nombre?: string;
  especie?: string;
  raza?: string;
  edad?: number;
}


// ==========================================================
// DATOS DE LAS CITAS
// ==========================================================

interface CitaResumen {
  id?: number;
  fechaHora?: string;
  estado?: string;
  motivo?: string;
  mascota?: {
    nombre?: string;
  };
  servicio?: {
    nombre?: string;
  };
  veterinario?: {
    nombre?: string;
  };
}


// ==========================================================
// COMPONENTE
// ==========================================================

@Component({
  selector: 'app-dashboard-usuario',

  standalone: true,

  imports: [
    CommonModule
  ],

  templateUrl: './dashboard-usuario.html',

  styleUrl: './dashboard-usuario.scss'
})
export class DashboardUsuario implements OnInit {


  // ========================================================
  // DIRECCIÓN DE LA API REST
  // ========================================================

  private readonly apiUrl =
    'http://100.110.172.31:8080/api';


  // ========================================================
  // CONTROL DEL MENÚ
  // ========================================================

  menuAbierto: boolean = false;


  // ========================================================
  // ESTADOS DE LA INTERFAZ
  // ========================================================

  cargando: boolean = true;

  errorCarga: boolean = false;


  // ========================================================
  // ESTADÍSTICAS
  //
  // null = consulta no disponible.
  // 0 = consulta correcta, sin registros.
  // ========================================================

  totalMascotas: number | null = null;

  totalCitas: number | null = null;

  totalServicios: number | null = null;

  totalVeterinarios: number | null = null;

  citasPendientes: number | null = null;


  // ========================================================
  // INFORMACIÓN PERSONAL
  // ========================================================

  misMascotas: MascotaResumen[] = [];

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
  // INICIAR DASHBOARD
  // ========================================================

  ngOnInit(): void {

    this.cargarResumen();

  }


  // ========================================================
  // PREPARAR ENCABEZADOS JWT
  // ========================================================

  private obtenerHeaders(): HttpHeaders {

    // Utiliza la sesión que guardó el Login.
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
  // CONSULTAR UNA LISTA DESDE SPRING BOOT
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

      // Un error no debe bloquear las otras consultas.
      catchError((error) => {

        console.error(
          `Error al consultar ${ruta}:`,
          error
        );

        return of(null);

      })

    );

  }


  // ========================================================
  // CARGAR RESUMEN DEL USUARIO
  // ========================================================

  cargarResumen(): void {

    this.cargando = true;
    this.errorCarga = false;

    // Estas rutas ya existen en el backend.
    // Las dos primeras consultan SOLO datos personales.
    forkJoin({

      mascotas:
        this.consultarLista<MascotaResumen>(
          '/mascotas/mis-mascotas'
        ),

      citas:
        this.consultarLista<CitaResumen>(
          '/citas/mis-citas'
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
        // TOTALES REALES
        // ==================================================

        this.totalMascotas =
          datos.mascotas?.length ?? null;

        this.totalCitas =
          datos.citas?.length ?? null;

        this.totalServicios =
          datos.servicios?.length ?? null;

        this.totalVeterinarios =
          datos.veterinarios?.length ?? null;


        // ==================================================
        // MIS MASCOTAS
        // ==================================================

        this.misMascotas = (
          datos.mascotas ?? []
        ).slice(0, 4);


        // ==================================================
        // MIS CITAS PENDIENTES
        // ==================================================

        if (datos.citas !== null) {

          this.citasPendientes = datos.citas.filter(
            cita =>
              cita.estado?.toUpperCase() === 'PENDIENTE'
          ).length;

        } else {

          this.citasPendientes = null;

        }


        // ==================================================
        // PRÓXIMAS CITAS
        // ==================================================

        if (datos.citas !== null) {

          const ahora = new Date();

          this.proximasCitas = datos.citas

            // Mostrar únicamente citas futuras
            // que no estén canceladas ni completadas.
            .filter(cita => {

              if (!cita.fechaHora) {
                return false;
              }

              const estado =
                cita.estado?.toUpperCase() ?? '';

              if (
                estado === 'CANCELADA' ||
                estado === 'COMPLETADA'
              ) {
                return false;
              }

              const fecha =
                new Date(cita.fechaHora);

              return (
                !isNaN(fecha.getTime()) &&
                fecha.getTime() >= ahora.getTime()
              );

            })

            // Ordenar desde la cita más cercana.
            .sort((a, b) => {

              return (
                new Date(a.fechaHora!).getTime() -
                new Date(b.fechaHora!).getTime()
              );

            })

            // Máximo tres próximas citas.
            .slice(0, 3);

        } else {

          this.proximasCitas = [];

        }


        // ==================================================
        // COMPROBAR ERRORES
        // ==================================================

        this.errorCarga = [
          datos.mascotas,
          datos.citas,
          datos.servicios,
          datos.veterinarios
        ].some(resultado => resultado === null);

        this.cargando = false;

        this.cd.detectChanges();

      },

      error: (error) => {

        console.error(
          'Error general del dashboard:',
          error
        );

        this.errorCarga = true;
        this.cargando = false;

        this.cd.detectChanges();

      }

    });

  }


  // ========================================================
  // CONTROL DEL MENÚ LATERAL
  // ========================================================

  cambiarMenu(): void {

    this.menuAbierto = !this.menuAbierto;

  }

  cerrarMenu(): void {

    this.menuAbierto = false;

  }


  // Cerrar el menú al pulsar Escape.
  @HostListener('document:keydown.escape')
  cerrarMenuConEscape(): void {

    this.cerrarMenu();

  }


  // ========================================================
  // NAVEGACIÓN GENERAL
  // ========================================================

  private navegar(ruta: string): void {

    this.cerrarMenu();

    void this.router.navigateByUrl(ruta);

  }


  // ========================================================
  // RUTAS DEL USUARIO
  // ========================================================

  irInicio(): void {

    this.navegar('/usuario/dashboard');

  }

  irMascotas(): void {

    this.navegar('/usuario/mascotas');

  }

  irCitas(): void {

    this.navegar('/usuario/citas');

  }

  irServicios(): void {

    this.navegar('/usuario/servicios');

  }

  irVeterinarios(): void {

    this.navegar('/usuario/veterinarios');

  }


  // ========================================================
  // CERRAR SESIÓN
  // ========================================================

  cerrarSesion(): void {

    // Cerrar menú y limpiar la sesión JWT.
    this.cerrarMenu();

    this.authServicio.cerrarSesion();

    // Regresar a la pantalla de acceso.
    void this.router.navigateByUrl('/login');

  }

}
