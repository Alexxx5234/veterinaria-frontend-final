import { environment } from '../../../../environments/environment';

/* ==========================================================
   VETERINARIA ARÉVALO
   ADMINISTRACIÓN DE ATENCIONES MÉDICAS (ADMIN)

   FUNCIONALIDADES:
   - Consultar todas las atenciones.
   - Consultar estadísticas generales.
   - Filtrar por fechas.
   - Buscar por mascota, veterinario y diagnóstico.
   - Filtrar por veterinario.
   - Consultar detalles de una atención.
   - Consultar historial clínico de una mascota.
   - Supervisión exclusivamente de lectura.

   SEGURIDAD:
   - Autenticación mediante JWT.
   - Endpoints administrativos protegidos.
   - No modifica información clínica.
   ========================================================== */

// ==========================================================
// 1. IMPORTACIONES
// ==========================================================

import {
  Component,
  OnInit,
  ChangeDetectorRef
} from '@angular/core';

import { CommonModule } from '@angular/common';

import { FormsModule } from '@angular/forms';

import {
  HttpClient,
  HttpHeaders
} from '@angular/common/http';

import { Router } from '@angular/router';

import { timeout } from 'rxjs/operators';

import { AuthServicio }
  from '../../../Servicios/auth-servicio';

import { NotificacionesServicio }
  from '../../../Servicios/notificaciones-servicio';


// ==========================================================
// 2. MODELO DE ATENCIÓN MÉDICA
// ==========================================================

interface AtencionAdmin {

  id: number;

  citaId: number;

  mascotaId: number;

  nombreMascota: string;

  veterinarioId: number;

  nombreVeterinario: string;

  diagnostico: string;

  tratamiento: string;

  observaciones?: string | null;

  medicamentosUtilizados?: string | null;

  medicamentosRecetados?: string | null;

  fechaAtencion: string;

}


// ==========================================================
// 3. MODELO DE ESTADÍSTICAS
// ==========================================================

interface AtencionesPorVeterinario {

  veterinarioId: number;

  nombreVeterinario: string;

  totalAtenciones: number;

}


interface EstadisticasAtenciones {

  totalAtenciones: number;

  totalMascotasAtendidas: number;

  totalVeterinariosConAtenciones: number;

  atencionesPorVeterinario: AtencionesPorVeterinario[];

}


// ==========================================================
// 4. COMPONENTE ANGULAR
// ==========================================================

@Component({

  selector: 'app-admin-atenciones',

  standalone: true,

  imports: [
    CommonModule,
    FormsModule
  ],

  templateUrl: './admin-atenciones.html',

  styleUrl: './admin-atenciones.scss'

})

export class AdminAtenciones implements OnInit {


  // ========================================================
  // 5. CONEXIÓN CON SPRING BOOT
  // ========================================================

  private readonly apiUrl =
    environment.apiUrl + '/atenciones-medicas';

  private readonly tiempoMaximo = 20000;


  // ========================================================
  // 6. LISTA DE ATENCIONES
  // ========================================================

  atenciones: AtencionAdmin[] = [];


  // ========================================================
  // 7. ESTADÍSTICAS
  // ========================================================

  estadisticas: EstadisticasAtenciones = {

    totalAtenciones: 0,

    totalMascotasAtendidas: 0,

    totalVeterinariosConAtenciones: 0,

    atencionesPorVeterinario: []

  };


  // ========================================================
  // 8. ESTADOS DE LA INTERFAZ
  // ========================================================

  cargando = false;

  cargandoEstadisticas = false;

  cargandoHistorial = false;

  errorCarga = false;

  errorEstadisticas = false;

  mensajeError = '';

  mensajeErrorEstadisticas = '';

  mensajeExito = '';


  // ========================================================
  // 9. BUSCADOR Y FILTROS
  // ========================================================

  busqueda = '';

  filtroVeterinario = 'TODOS';

  fechaDesde = '';

  fechaHasta = '';


  // ========================================================
  // 10. DETALLE DE ATENCIÓN
  // ========================================================

  atencionSeleccionada: AtencionAdmin | null = null;


  // ========================================================
  // 11. HISTORIAL CLÍNICO
  // ========================================================

  historialMascota: AtencionAdmin[] = [];

  historialVisible = false;


  // ========================================================
  // 12. CONSTRUCTOR
  // ========================================================

  constructor(

    private http: HttpClient,

    private authServicio: AuthServicio,

    private notificacionesServicio: NotificacionesServicio,

    private cd: ChangeDetectorRef,

    private router: Router

  ) {}


  // ========================================================
  // 13. INICIALIZACIÓN
  // ========================================================

  ngOnInit(): void {

    this.cargarAtenciones();

    this.cargarEstadisticas();

  }


  // ========================================================
  // 14. AUTENTICACIÓN JWT
  // ========================================================

  private obtenerHeaders(): HttpHeaders {

    const token = this.authServicio.obtenerToken();

    return token

      ? new HttpHeaders({

          Authorization: `Bearer ${token}`

        })

      : new HttpHeaders();

  }


  // ========================================================
  // 15. CONSULTAR TODAS LAS ATENCIONES
  // ========================================================

  cargarAtenciones(
    actualizacionManual = false
  ): void {

    if (this.cargando) {
      return;
    }

    this.mensajeError = '';

    this.mensajeExito = '';

    this.errorCarga = false;


    // Las dos fechas deben proporcionarse juntas.

    if (
      Boolean(this.fechaDesde) !==
      Boolean(this.fechaHasta)
    ) {

      this.mensajeError =
        'Debes seleccionar las dos fechas para aplicar el filtro.';

      return;

    }


    // Validar orden de las fechas.

    if (
      this.fechaDesde &&
      this.fechaHasta &&
      this.fechaDesde > this.fechaHasta
    ) {

      this.mensajeError =
        'La fecha inicial no puede ser posterior a la fecha final.';

      return;

    }


    this.cargando = true;


    // Seleccionar el endpoint correspondiente.

    let url = this.apiUrl;

    if (this.fechaDesde && this.fechaHasta) {

      url +=
        `/fechas?desde=${this.fechaDesde}&hasta=${this.fechaHasta}`;

    }


    this.http.get<AtencionAdmin[]>(

      url,

      {
        headers: this.obtenerHeaders()
      }

    ).pipe(

      timeout(this.tiempoMaximo)

    ).subscribe({

      next: respuesta => {

        this.atenciones = Array.isArray(respuesta)

          ? [...respuesta].sort((a, b) =>

              new Date(b.fechaAtencion).getTime() -
              new Date(a.fechaAtencion).getTime()

            )

          : [];


        this.cargando = false;

        this.errorCarga = false;


        if (actualizacionManual) {

          this.mensajeExito =
            'Las atenciones médicas se actualizaron correctamente.';

          this.notificacionesServicio.agregar(

            'Atenciones actualizadas',

            'Se consultaron nuevamente los registros médicos.',

            'info'

          );

        }


        this.cd.detectChanges();

      },


      error: error => {

        console.error(
          'Error al consultar atenciones:',
          error
        );


        this.cargando = false;

        this.errorCarga = true;


        this.mensajeError =

          error?.status === 0

            ? 'No se pudo conectar con Spring Boot. Comprueba que el backend esté encendido.'

            : this.obtenerMensajeError(
                error,
                'No se pudieron cargar las atenciones médicas.'
              );


        this.notificacionesServicio.agregar(

          'Error al consultar atenciones',

          this.mensajeError,

          'error'

        );


        this.cd.detectChanges();

      }

    });

  }


  // ========================================================
  // 16. CONSULTAR ESTADÍSTICAS GENERALES
  // ========================================================

  cargarEstadisticas(): void {

    this.cargandoEstadisticas = true;

    this.errorEstadisticas = false;

    this.http.get<EstadisticasAtenciones>(

      `${this.apiUrl}/estadisticas`,

      {
        headers: this.obtenerHeaders()
      }

    ).pipe(

      timeout(this.tiempoMaximo)

    ).subscribe({

      next: respuesta => {

        this.estadisticas = respuesta;

        this.cargandoEstadisticas = false;

        this.errorEstadisticas = false;

        this.cd.detectChanges();

      },

      error: error => {

        console.error(
          'Error al consultar estadísticas:',
          error
        );

        this.cargandoEstadisticas = false;

        this.errorEstadisticas = true;

        this.mensajeErrorEstadisticas =
          this.obtenerMensajeError(
            error,
            'No se pudieron consultar las estadísticas.'
          );

        this.cd.detectChanges();

      }

    });

  }


  // ========================================================
  // 17. ACTUALIZAR INFORMACIÓN
  // ========================================================

  actualizarDatos(): void {

    this.cargarAtenciones(true);

    this.cargarEstadisticas();

  }


  // ========================================================
  // 18. OBTENER MENSAJE DE ERROR
  // ========================================================

  private obtenerMensajeError(
    error: any,
    mensajePredeterminado: string
  ): string {

    const respuesta = error?.error;

    if (typeof respuesta === 'string') {
      return respuesta;
    }

    return (

      respuesta?.mensaje ||

      respuesta?.message ||

      respuesta?.detail ||

      mensajePredeterminado

    );

  }


  // ========================================================
  // 19. OBTENER VETERINARIOS DISPONIBLES
  // ========================================================

  get veterinariosDisponibles(): AtencionesPorVeterinario[] {

    const mapa = new Map<number, AtencionesPorVeterinario>();

    this.atenciones.forEach(atencion => {

      if (!mapa.has(atencion.veterinarioId)) {

        mapa.set(atencion.veterinarioId, {

          veterinarioId: atencion.veterinarioId,

          nombreVeterinario: atencion.nombreVeterinario,

          totalAtenciones: 0

        });

      }

    });

    return Array.from(mapa.values()).sort(

      (a, b) =>
        a.nombreVeterinario.localeCompare(
          b.nombreVeterinario,
          'es'
        )

    );

  }


  // ========================================================
  // 20. FILTRAR Y BUSCAR ATENCIONES
  // ========================================================

  get atencionesFiltradas(): AtencionAdmin[] {

    const texto = this.normalizarTexto(this.busqueda);

    return this.atenciones.filter(atencion => {

      // Filtro por veterinario.

      const coincideVeterinario =

        this.filtroVeterinario === 'TODOS' ||

        atencion.veterinarioId ===
          Number(this.filtroVeterinario);


      // Búsqueda general.

      const contenido = [

        atencion.id,

        atencion.citaId,

        atencion.mascotaId,

        atencion.nombreMascota,

        atencion.nombreVeterinario,

        atencion.diagnostico,

        atencion.tratamiento,

        atencion.observaciones,

        atencion.medicamentosUtilizados,

        atencion.medicamentosRecetados

      ].join(' ');


      const coincideBusqueda =

        !texto ||

        this.normalizarTexto(contenido).includes(texto);


      return coincideVeterinario && coincideBusqueda;

    });

  }


  // ========================================================
  // 21. NORMALIZAR TEXTO
  // ========================================================

  private normalizarTexto(valor: unknown): string {

    return String(valor ?? '')

      .normalize('NFD')

      .replace(/[\u0300-\u036f]/g, '')

      .trim()

      .toLowerCase();

  }


  // ========================================================
  // 22. ESTADÍSTICAS POR VETERINARIO
  // ========================================================

  get maximoAtencionesVeterinario(): number {

    return Math.max(

      0,

      ...this.estadisticas.atencionesPorVeterinario.map(

        item => item.totalAtenciones

      )

    );

  }


  porcentajeVeterinario(total: number): number {

    if (this.maximoAtencionesVeterinario === 0) {

      return 0;

    }

    return Math.round(

      total / this.maximoAtencionesVeterinario * 100

    );

  }


  // ========================================================
  // 23. ABRIR DETALLE DE UNA ATENCIÓN
  // ========================================================

  abrirDetalle(atencion: AtencionAdmin): void {

    this.atencionSeleccionada = atencion;

    this.historialMascota = [];

    this.historialVisible = false;

  }


  // ========================================================
  // 24. CERRAR DETALLE
  // ========================================================

  cerrarDetalle(): void {

    this.atencionSeleccionada = null;

    this.historialMascota = [];

    this.historialVisible = false;

  }


  // ========================================================
  // 25. CONSULTAR HISTORIAL CLÍNICO DE UNA MASCOTA
  // ========================================================

  verHistorialMascota(): void {

    if (
      !this.atencionSeleccionada ||
      this.cargandoHistorial
    ) {

      return;

    }

    const mascotaId =
      this.atencionSeleccionada.mascotaId;


    this.cargandoHistorial = true;

    this.historialVisible = true;


    this.http.get<AtencionAdmin[]>(

      `${this.apiUrl}/mascota/${mascotaId}/historial`,

      {
        headers: this.obtenerHeaders()
      }

    ).pipe(

      timeout(this.tiempoMaximo)

    ).subscribe({

      next: respuesta => {

        this.historialMascota = Array.isArray(respuesta)

          ? respuesta

          : [];

        this.cargandoHistorial = false;

        this.cd.detectChanges();

      },

      error: error => {

        console.error(
          'Error al consultar historial:',
          error
        );

        this.cargandoHistorial = false;

        this.historialVisible = false;

        this.mensajeError = this.obtenerMensajeError(

          error,

          'No se pudo consultar el historial clínico.'

        );

        this.cd.detectChanges();

      }

    });

  }


  // ========================================================
  // 26. CERRAR HISTORIAL
  // ========================================================

  cerrarHistorial(): void {

    this.historialVisible = false;

    this.historialMascota = [];

  }


  // ========================================================
  // 27. LIMPIAR FILTROS
  // ========================================================

  limpiarFiltros(): void {

    this.busqueda = '';

    this.filtroVeterinario = 'TODOS';

    this.fechaDesde = '';

    this.fechaHasta = '';

    this.cargarAtenciones();

  }


  // ========================================================
  // 28. VOLVER AL DASHBOARD
  // ========================================================

  volverDashboard(): void {

    this.router.navigate(['/admin/dashboard']);

  }

}
