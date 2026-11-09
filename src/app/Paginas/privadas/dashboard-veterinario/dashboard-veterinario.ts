import { environment } from '../../../../environments/environment';

/* ==========================================================
   VETERINARIA ARÉVALO · DASHBOARD DEL VETERINARIO

   RESPONSABILIDADES:

   1. Consultar las citas del veterinario autenticado.
   2. Consultar las atenciones médicas registradas.
   3. Consultar las facturas autorizadas para el usuario.
   4. Calcular los indicadores del dashboard.
   5. Mostrar las próximas citas.
   6. Filtrar las facturas emitidas durante el día actual.
   7. Calcular el importe total facturado del día.

   SEGURIDAD:
   - Las peticiones utilizan el JWT del usuario.
   - No se envía un ID de veterinario desde Angular.
   - El backend determina qué información puede consultar.

   BACKEND:
   GET /api/citas/mis-citas-veterinario
   GET /api/atenciones-medicas/mis-atenciones
   GET /api/facturas/mis-facturas
========================================================== */

import {
  Component,
  OnInit,
  ChangeDetectorRef
} from '@angular/core';

import { CommonModule } from '@angular/common';

import {
  HttpClient,
  HttpHeaders
} from '@angular/common/http';

import {
  forkJoin,
  of
} from 'rxjs';

import {
  catchError
} from 'rxjs/operators';

import {
  AuthServicio
} from '../../../Servicios/auth-servicio';


/* ==========================================================
   1. INTERFAZ DE CITAS

   Representa los datos que devuelve CitaController.
========================================================== */

interface CitaVeterinario {

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

}


/* ==========================================================
   2. INTERFAZ DE FACTURAS

   Corresponde a FacturaRespuesta del backend Spring Boot.

   fechaEmision:
   Fecha y hora en que se emitió el comprobante.

   total:
   Importe total de la factura.

   correoEnviado:
   Indica si el PDF fue enviado correctamente al propietario.
========================================================== */

interface FacturaVeterinario {

  id: number;

  numeroFactura: string;

  atencionId: number;

  citaId: number;

  nombreCliente: string;

  correoCliente: string;

  nombreMascota: string;

  nombreVeterinario: string;

  nombreServicio: string;

  precioServicio: number | string;

  totalMedicamentos: number | string;

  subtotal: number | string;

  impuestos: number | string;

  total: number | string;

  estado: string;

  correoEnviado: boolean;

  fechaCreacion: string;

  fechaEmision: string;

}


/* ==========================================================
   3. COMPONENTE PRINCIPAL
========================================================== */

@Component({

  selector: 'app-dashboard-veterinario',

  standalone: true,

  imports: [
    CommonModule
  ],

  templateUrl: './dashboard-veterinario.html',

  styleUrl: './dashboard-veterinario.scss'

})

export class DashboardVeterinario implements OnInit {


  /* ========================================================
     3.1. CONFIGURACIÓN Y SERVICIOS
  ======================================================== */

  // Dirección actual del backend.
  // Se conserva la IP que ya utiliza tu proyecto.

  private readonly apiUrl =
    environment.apiUrl;


  constructor(

    private http: HttpClient,

    private authServicio: AuthServicio,

    private cd: ChangeDetectorRef

  ) {}


  /* ========================================================
     3.2. ESTADOS GENERALES DEL DASHBOARD
  ======================================================== */

  // Indica si se están realizando las consultas.
  cargando = false;

  // Error de consulta de citas o atenciones.
  errorCarga = false;

  // Error independiente de facturación.
  errorFacturas = false;


  /* ========================================================
     3.3. INDICADORES DE CITAS Y ATENCIONES
  ======================================================== */

  totalCitas: number | null = null;

  citasPendientes: number | null = null;

  citasConfirmadas: number | null = null;

  totalAtenciones: number | null = null;

  citasHoy: number | null = null;


  /* ========================================================
     3.4. INFORMACIÓN DE LAS LISTAS
  ======================================================== */

  // Próximas citas del veterinario autenticado.
  proximasCitas: CitaVeterinario[] = [];

  // Facturas emitidas exclusivamente durante el día actual.
  facturasHoy: FacturaVeterinario[] = [];


  /* ========================================================
     3.5. INICIALIZACIÓN
  ======================================================== */

  ngOnInit(): void {

    // Cuando se abre el dashboard se consultan automáticamente
    // las citas, atenciones y facturas.

    this.cargarResumen();

  }


  /* ========================================================
     4. CARGA GENERAL DE INFORMACIÓN
  ======================================================== */

  cargarResumen(): void {

    // Evita ejecutar varias consultas simultáneamente.
    if (this.cargando) return;

    this.cargando = true;

    this.errorCarga = false;

    this.errorFacturas = false;

    // Obtenemos el token de la sesión actual.
    const token = this.authServicio.obtenerToken();

    // El token identifica al usuario autenticado.
    const headers = token

      ? new HttpHeaders({
          Authorization: `Bearer ${token}`
        })

      : new HttpHeaders();


    /* ======================================================
       CONSULTAS SIMULTÁNEAS A SPRING BOOT

       forkJoin permite ejecutar las tres consultas en paralelo.

       Cada petición tiene su propio catchError para evitar que
       un error de facturación impida cargar las citas.
    ======================================================= */

    forkJoin({

      // 1. Citas asignadas al veterinario.
      citas: this.http.get<CitaVeterinario[]>(

        `${this.apiUrl}/citas/mis-citas-veterinario`,

        { headers }

      ).pipe(

        catchError(() => of(null))

      ),


      // 2. Atenciones médicas del veterinario.
      atenciones: this.http.get<unknown[]>(

        `${this.apiUrl}/atenciones-medicas/mis-atenciones`,

        { headers }

      ).pipe(

        catchError(() => of(null))

      ),


      // 3. Facturas autorizadas para el usuario autenticado.
      facturas: this.http.get<FacturaVeterinario[]>(

        `${this.apiUrl}/facturas/mis-facturas`,

        { headers }

      ).pipe(

        catchError(() => of(null))

      )

    }).subscribe({

      /* ====================================================
         5. PROCESAMIENTO DE RESPUESTAS
      ===================================================== */

      next: ({ citas, atenciones, facturas }) => {

        const ahora = new Date();


        /* ==================================================
           5.1. PROCESAR CITAS
        =================================================== */

        this.totalCitas = citas?.length ?? null;

        this.totalAtenciones = atenciones?.length ?? null;


        // Contar citas pendientes.
        this.citasPendientes = citas?.filter(c =>

          c.estado?.toUpperCase() === 'PENDIENTE'

        ).length ?? null;


        // Contar citas confirmadas.
        this.citasConfirmadas = citas?.filter(c =>

          c.estado?.toUpperCase() === 'CONFIRMADA'

        ).length ?? null;


        // Contar las citas correspondientes al día actual.
        this.citasHoy = citas?.filter(c => {

          if (
            !c.fechaHora ||
            c.estado?.toUpperCase() === 'CANCELADA'
          ) {
            return false;
          }

          const fecha = new Date(c.fechaHora);

          return (

            !isNaN(fecha.getTime()) &&

            fecha.toDateString() === ahora.toDateString()

          );

        }).length ?? null;


        /* ==================================================
           5.2. OBTENER PRÓXIMAS CITAS
        =================================================== */

        this.proximasCitas = (citas ?? [])

          // Excluir citas que ya no deben mostrarse.
          .filter(c => {

            if (
              !c.fechaHora ||

              [
                'CANCELADA',
                'COMPLETADA',
                'RECHAZADA'
              ].includes((c.estado ?? '').toUpperCase())

            ) {

              return false;

            }

            const fecha = new Date(c.fechaHora);

            return (

              !isNaN(fecha.getTime()) &&

              fecha.getTime() >= ahora.getTime()

            );

          })

          // Ordenar desde la cita más cercana.
          .sort((a, b) =>

            new Date(a.fechaHora!).getTime() -

            new Date(b.fechaHora!).getTime()

          )

          // Mostrar solamente las cinco próximas.
          .slice(0, 5);


        /* ==================================================
           5.3. PROCESAR FACTURAS
        =================================================== */

        // Si la API falla, mostramos un error independiente.
       // Verificar que el backend haya devuelto una lista válida.
if (facturas === null || !Array.isArray(facturas)) {

  this.errorFacturas = true;
  this.facturasHoy = [];

} else {

  this.errorFacturas = false;

  // Filtrar las facturas correspondientes al día actual.
  this.facturasHoy = this.obtenerFacturasDelDia(facturas);

}


        /* ==================================================
           5.4. ESTADO GENERAL DE LAS CONSULTAS
        =================================================== */

        // Los errores de facturación se manejan por separado.
        this.errorCarga =

          citas === null ||

          atenciones === null;


        // Finalizar indicador de carga.
        this.cargando = false;

        // Actualizar la vista.
        this.cd.detectChanges();

      },


      /* ====================================================
         6. MANEJO DE ERRORES GENERALES
      ===================================================== */

      error: (error) => {

        console.error(
          'Error al cargar el dashboard veterinario:',
          error
        );

        this.errorCarga = true;

        this.errorFacturas = true;

        this.cargando = false;

        this.cd.detectChanges();

      }

    });

  }


  /* ========================================================
     7. FILTRAR FACTURAS EMITIDAS HOY

     Se utiliza fechaEmision, no fechaCreacion.

     De esta manera solo se muestran los comprobantes cuya
     fecha real de emisión corresponde al día actual.

     Se compara el formato YYYY-MM-DD para evitar errores
     causados por la conversión de fechas y zonas horarias.
  ======================================================== */

  private obtenerFacturasDelDia(

    facturas: FacturaVeterinario[]

  ): FacturaVeterinario[] {

    // Fecha actual en formato local YYYY-MM-DD.
    const hoy = this.obtenerFechaLocalISO(new Date());

    return facturas

      .filter(factura => {

        // La fecha de emisión es el criterio de filtrado.
        const fechaEmision = this.obtenerSoloFecha(
          factura.fechaEmision
        );

        return fechaEmision === hoy;

      })

      // Ordenar de la factura más reciente a la más antigua.
      .sort((a, b) =>

        (b.fechaEmision || '').localeCompare(
          a.fechaEmision || ''
        )

      );

  }


  /* ========================================================
     8. OBTENER FECHA LOCAL

     Se evita toISOString() porque convierte la fecha a UTC.
     El dashboard debe comparar usando el día local del equipo.
  ======================================================== */

  private obtenerFechaLocalISO(fecha: Date): string {

    const anio = fecha.getFullYear();

    const mes = String(
      fecha.getMonth() + 1
    ).padStart(2, '0');

    const dia = String(
      fecha.getDate()
    ).padStart(2, '0');

    return `${anio}-${mes}-${dia}`;

  }


  /* ========================================================
     9. EXTRAER ÚNICAMENTE LA FECHA

     Ejemplo:
     2026-11-04T14:30:00

     Resultado:
     2026-11-04
  ======================================================== */

  private obtenerSoloFecha(
    valor?: string | null
  ): string | null {

    if (!valor) return null;

    const fecha = valor.trim().substring(0, 10);

    // Verificar que el formato de fecha sea correcto.
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {

      return null;

    }

    return fecha;

  }


  /* ========================================================
     10. CALCULAR TOTAL FACTURADO HOY

     Se suman los importes de las facturas que ya fueron
     filtradas por fecha de emisión.

     Importante:
     Es el importe facturado, no necesariamente el dinero
     efectivamente cobrado.
  ======================================================== */

  get totalFacturadoHoy(): number {

    return this.facturasHoy.reduce(

      (acumulado, factura) => {

        const importe = Number(factura.total ?? 0);

        return acumulado +

          (Number.isFinite(importe) ? importe : 0);

      },

      0

    );

  }


  /* ========================================================
     11. FORMATEAR IMPORTES MONETARIOS

     Se utiliza USD porque la veterinaria trabaja en Ecuador.
  ======================================================== */

  formatearMoneda(
    valor: number | string | null | undefined
  ): string {

    const numero = Number(valor ?? 0);

    const importe = Number.isFinite(numero)
      ? numero
      : 0;

    return new Intl.NumberFormat('es-EC', {

      style: 'currency',

      currency: 'USD',

      minimumFractionDigits: 2,

      maximumFractionDigits: 2

    }).format(importe);

  }


  /* ========================================================
     12. FORMATEAR FECHA DE EMISIÓN

     Se presenta la fecha en formato ecuatoriano:
     DD/MM/YYYY HH:mm
  ======================================================== */

  mostrarFechaFactura(valor?: string): string {

    if (!valor) {

      return 'Fecha no disponible';

    }

    const fecha = new Date(valor);

    if (isNaN(fecha.getTime())) {

      return valor.replace('T', ' ').substring(0, 16);

    }

    return new Intl.DateTimeFormat('es-EC', {

      day: '2-digit',

      month: '2-digit',

      year: 'numeric',

      hour: '2-digit',

      minute: '2-digit',

      hour12: false

    }).format(fecha);

  }

}
