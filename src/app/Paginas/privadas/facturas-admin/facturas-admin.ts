import { environment } from '../../../../environments/environment';

/* ==========================================================
   VETERINARIA ARÉVALO
   MÓDULO ADMINISTRATIVO DE FACTURAS

   FUNCIONES:
   1. Consultar todas las facturas de la clínica.
   2. Buscar por propietario, mascota, veterinario y número.
   3. Filtrar por día y rango de fechas.
   4. Filtrar por estado de factura.
   5. Consultar el estado del correo.
   6. Calcular ingresos diarios y mensuales.
   7. Consultar el detalle de cada factura.
   8. Descargar comprobantes PDF.
   9. Exportar resultados filtrados a CSV.
   10. Mostrar resultados paginados.

   SEGURIDAD:
   - Acceso exclusivo ADMIN.
   - Utiliza el JWT de AuthServicio.
   - Spring Boot valida los permisos.
   - No permite emitir ni modificar facturas.

   IMPORTANTE:
   Los comprobantes son internos del proyecto.
   No sustituyen una factura electrónica autorizada por SRI.
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

import { timeout } from 'rxjs/operators';

import { AuthServicio } from '../../../Servicios/auth-servicio';


// ==========================================================
// 2. INTERFAZ DE MEDICAMENTOS FACTURADOS
// ==========================================================

interface LineaMedicamentoFactura {

  detalleId: number;

  medicamentoId: number;

  nombreMedicamento: string;

  unidadMedida: string;

  tipoRegistro: string;

  cantidad: number | string;

  precioUnitario: number | string;

  subtotal: number | string;

  indicaciones?: string | null;

}


// ==========================================================
// 3. INTERFAZ DE FACTURA
// ==========================================================

interface FacturaAdmin {

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

  medicamentos: LineaMedicamentoFactura[];

  totalMedicamentos: number | string;

  subtotal: number | string;

  impuestos: number | string;

  total: number | string;

  estado: string;

  correoEnviado: boolean;

  fechaCreacion: string | null;

  fechaEmision: string | null;

}


// ==========================================================
// 4. INTERFAZ DE FILTROS
// ==========================================================

interface FiltrosFacturaAdmin {

  busqueda: string;

  fecha: string;

  desde: string;

  hasta: string;

  estado: string;

  correo: string;

}


// ==========================================================
// 5. CONFIGURACIÓN DEL COMPONENTE
// ==========================================================

@Component({

  selector: 'app-facturas-admin',

  standalone: true,

  imports: [
    CommonModule,
    FormsModule
  ],

  templateUrl: './facturas-admin.html',

  styleUrl: './facturas-admin.scss'

})

export class FacturasAdmin implements OnInit {


  // ========================================================
  // 6. CONFIGURACIÓN DE LA API
  // ========================================================

  private readonly apiUrl =
    environment.apiUrl;

  private readonly tiempoMaximo = 25000;


  // ========================================================
  // 7. INFORMACIÓN DE FACTURAS
  // ========================================================

  facturas: FacturaAdmin[] = [];

  facturasFiltradas: FacturaAdmin[] = [];

  facturaSeleccionada: FacturaAdmin | null = null;


  // ========================================================
  // 8. CONFIGURACIÓN DE FILTROS
  // ========================================================

  filtros: FiltrosFacturaAdmin = {

    busqueda: '',

    fecha: '',

    desde: '',

    hasta: '',

    estado: 'TODOS',

    correo: 'TODOS'

  };


  // ========================================================
  // 9. ESTADOS DE LA PANTALLA
  // ========================================================

  cargando = false;

  error = '';

  mensaje = '';

  tipoMensaje: 'exito' | 'error' = 'exito';

  descargandoId: number | null = null;


  // ========================================================
  // 10. PAGINACIÓN
  // ========================================================

  paginaActual = 1;

  readonly tamanoPagina = 10;


  // ========================================================
  // 11. CONSTRUCTOR
  // ========================================================

  constructor(

    private http: HttpClient,

    private authServicio: AuthServicio,

    private cd: ChangeDetectorRef

  ) {}


  // ========================================================
  // 12. INICIALIZAR COMPONENTE
  // ========================================================

  ngOnInit(): void {

    this.cargarFacturas();

  }


  // ========================================================
  // 13. OBTENER TOKEN JWT
  // ========================================================

  /*
    La identidad del administrador se obtiene de la sesión.

    No se envía ningún ID de usuario desde la pantalla.
  */

  private obtenerHeaders(): HttpHeaders {

    const token = this.authServicio.obtenerToken();

    return token

      ? new HttpHeaders({
          Authorization: `Bearer ${token}`
        })

      : new HttpHeaders();

  }


  // ========================================================
  // 14. CONSULTAR TODAS LAS FACTURAS
  // ========================================================

  /*
    GET /api/facturas

    ENDPOINT EXCLUSIVO ADMIN.

    Spring Boot devuelve las facturas ordenadas
    desde la más reciente hasta la más antigua.
  */

  cargarFacturas(): void {

    if (this.cargando) return;

    this.cargando = true;

    this.error = '';

    this.mensaje = '';

    this.http.get<FacturaAdmin[]>(

      `${this.apiUrl}/facturas`,

      {
        headers: this.obtenerHeaders()
      }

    ).pipe(

      timeout(this.tiempoMaximo)

    ).subscribe({

      next: respuesta => {

        this.facturas = Array.isArray(respuesta)

          ? [...respuesta].sort((a, b) =>
              this.fechaMilisegundos(b) -
              this.fechaMilisegundos(a)
            )

          : [];

        this.aplicarFiltros();

        this.cargando = false;

        this.cd.detectChanges();

      },

      error: err => {

        console.error(
          'Error consultando facturas administrativas:',
          err
        );

        this.facturas = [];

        this.facturasFiltradas = [];

        this.cargando = false;

        this.error = this.obtenerMensajeError(err);

        this.cd.detectChanges();

      }

    });

  }


  // ========================================================
  // 15. APLICAR FILTROS
  // ========================================================

  aplicarFiltros(): void {

    const texto = this.normalizar(
      this.filtros.busqueda
    );

    this.facturasFiltradas = this.facturas.filter(
      factura => {

        const fecha = this.fechaISO(factura);

        // ----------------------------------------------
        // BÚSQUEDA GENERAL
        // ----------------------------------------------

        const contenido = this.normalizar([

          factura.numeroFactura,

          factura.nombreCliente,

          factura.correoCliente,

          factura.nombreMascota,

          factura.nombreVeterinario,

          factura.nombreServicio,

          factura.atencionId,

          factura.citaId

        ].join(' '));

        if (
          texto &&
          !contenido.includes(texto)
        ) {

          return false;

        }


        // ----------------------------------------------
        // FECHA EXACTA
        // ----------------------------------------------

        if (
          this.filtros.fecha &&
          fecha !== this.filtros.fecha
        ) {

          return false;

        }


        // ----------------------------------------------
        // FECHA INICIAL
        // ----------------------------------------------

        if (
          this.filtros.desde &&
          (!fecha || fecha < this.filtros.desde)
        ) {

          return false;

        }


        // ----------------------------------------------
        // FECHA FINAL
        // ----------------------------------------------

        if (
          this.filtros.hasta &&
          (!fecha || fecha > this.filtros.hasta)
        ) {

          return false;

        }


        // ----------------------------------------------
        // ESTADO DE FACTURA
        // ----------------------------------------------

        const estado = String(
          factura.estado ?? ''
        ).toUpperCase();

        if (
          this.filtros.estado !== 'TODOS' &&
          estado !== this.filtros.estado
        ) {

          return false;

        }


        // ----------------------------------------------
        // ESTADO DEL CORREO
        // ----------------------------------------------

        if (
          this.filtros.correo === 'ENVIADO' &&
          !factura.correoEnviado
        ) {

          return false;

        }

        if (
          this.filtros.correo === 'PENDIENTE' &&
          factura.correoEnviado
        ) {

          return false;

        }

        return true;

      }

    );

    this.paginaActual = 1;

  }


  // ========================================================
  // 16. LIMPIAR FILTROS
  // ========================================================

  limpiarFiltros(): void {

    this.filtros = {

      busqueda: '',

      fecha: '',

      desde: '',

      hasta: '',

      estado: 'TODOS',

      correo: 'TODOS'

    };

    this.aplicarFiltros();

  }


  // ========================================================
  // 17. FILTRAR FACTURAS DEL DÍA
  // ========================================================

  filtrarHoy(): void {

    this.limpiarFiltros();

    this.filtros.fecha = this.fechaActual();

    this.aplicarFiltros();

  }


  // ========================================================
  // 18. FILTRAR FACTURAS DEL MES ACTUAL
  // ========================================================

  filtrarMesActual(): void {

    this.limpiarFiltros();

    const hoy = this.fechaActual();

    this.filtros.desde =
      `${hoy.substring(0, 7)}-01`;

    this.filtros.hasta = hoy;

    this.aplicarFiltros();

  }


  // ========================================================
  // 19. NORMALIZAR TEXTO
  // ========================================================

  /*
    Permite buscar sin diferenciar:
    - Mayúsculas.
    - Minúsculas.
    - Tildes.
  */

  private normalizar(valor: unknown): string {

    return String(valor ?? '')

      .trim()

      .toLocaleLowerCase('es-EC')

      .normalize('NFD')

      .replace(/[\u0300-\u036f]/g, '');

  }


  // ========================================================
  // 20. INDICADORES GENERALES
  // ========================================================

  get totalFacturas(): number {

    return this.facturas.length;

  }


  // Total histórico de facturas emitidas.

  get totalFacturado(): number {

    return this.facturas

      .filter(f =>
        (f.estado || '').toUpperCase() === 'EMITIDA'
      )

      .reduce(
        (suma, factura) =>
          suma + this.numero(factura.total),
        0
      );

  }


  // Cantidad de facturas emitidas hoy.

  get facturasHoy(): number {

    const hoy = this.fechaActual();

    return this.facturas.filter(f =>

      this.fechaISO(f) === hoy &&

      (f.estado || '').toUpperCase() === 'EMITIDA'

    ).length;

  }


  // Ingresos correspondientes al día actual.

  get ingresosHoy(): number {

    const hoy = this.fechaActual();

    return this.facturas

      .filter(f =>

        this.fechaISO(f) === hoy &&

        (f.estado || '').toUpperCase() === 'EMITIDA'

      )

      .reduce(
        (suma, factura) =>
          suma + this.numero(factura.total),
        0
      );

  }


  // Ingresos correspondientes al mes actual.

  get ingresosMesActual(): number {

    const hoy = this.fechaActual();

    const inicioMes = `${hoy.substring(0, 7)}-01`;

    return this.facturas

      .filter(f => {

        const fecha = this.fechaISO(f);

        return (

          fecha >= inicioMes &&

          fecha <= hoy &&

          (f.estado || '').toUpperCase() === 'EMITIDA'

        );

      })

      .reduce(
        (suma, factura) =>
          suma + this.numero(factura.total),
        0
      );

  }


  // Cantidad de facturas con correo enviado.

  get correosEnviados(): number {

    return this.facturas.filter(
      f => f.correoEnviado
    ).length;

  }


  // Cantidad de facturas pendientes de correo.

  get correosPendientes(): number {

    return this.facturas.filter(
      f => !f.correoEnviado
    ).length;

  }


  // Cantidad de resultados después de filtrar.

  get totalResultados(): number {

    return this.facturasFiltradas.length;

  }


  // ========================================================
  // 21. PAGINACIÓN
  // ========================================================

  get totalPaginas(): number {

    return Math.max(

      1,

      Math.ceil(
        this.facturasFiltradas.length /
        this.tamanoPagina
      )

    );

  }


  get facturasPagina(): FacturaAdmin[] {

    const inicio =
      (this.paginaActual - 1) *
      this.tamanoPagina;

    return this.facturasFiltradas.slice(

      inicio,

      inicio + this.tamanoPagina

    );

  }


  paginaAnterior(): void {

    if (this.paginaActual > 1) {

      this.paginaActual--;

    }

  }


  paginaSiguiente(): void {

    if (this.paginaActual < this.totalPaginas) {

      this.paginaActual++;

    }

  }


  // ========================================================
  // 22. MANEJO DE FECHAS
  // ========================================================

  private obtenerFecha(
    factura: FacturaAdmin
  ): Date | null {

    const valor =
      factura.fechaEmision ||
      factura.fechaCreacion;

    if (!valor) return null;

    const normalizado = valor.includes('T')

      ? valor

      : valor.replace(' ', 'T');

    const fecha = new Date(normalizado);

    return Number.isNaN(fecha.getTime())

      ? null

      : fecha;

  }


  private fechaISO(
    factura: FacturaAdmin
  ): string {

    const fecha = this.obtenerFecha(factura);

    if (!fecha) return '';

    const anio = fecha.getFullYear();

    const mes = String(
      fecha.getMonth() + 1
    ).padStart(2, '0');

    const dia = String(
      fecha.getDate()
    ).padStart(2, '0');

    return `${anio}-${mes}-${dia}`;

  }


  private fechaMilisegundos(
    factura: FacturaAdmin
  ): number {

    return this.obtenerFecha(factura)?.getTime() ?? 0;

  }


  private fechaActual(): string {

    const hoy = new Date();

    const anio = hoy.getFullYear();

    const mes = String(
      hoy.getMonth() + 1
    ).padStart(2, '0');

    const dia = String(
      hoy.getDate()
    ).padStart(2, '0');

    return `${anio}-${mes}-${dia}`;

  }


  mostrarFecha(
    factura: FacturaAdmin
  ): string {

    const fecha = this.obtenerFecha(factura);

    if (!fecha) return 'No disponible';

    return new Intl.DateTimeFormat('es-EC', {

      day: '2-digit',

      month: 'short',

      year: 'numeric',

      hour: '2-digit',

      minute: '2-digit',

      hour12: false

    }).format(fecha);

  }


  // ========================================================
  // 23. FORMATO MONETARIO
  // ========================================================

  formatoDinero(
    valor: number | string | null | undefined
  ): string {

    return new Intl.NumberFormat('es-EC', {

      style: 'currency',

      currency: 'USD',

      minimumFractionDigits: 2,

      maximumFractionDigits: 2

    }).format(this.numero(valor));

  }


  numero(
    valor: number | string | null | undefined
  ): number {

    const resultado = Number(valor ?? 0);

    return Number.isFinite(resultado)
      ? resultado
      : 0;

  }


  // ========================================================
  // 24. CONSULTAR DETALLE DE FACTURA
  // ========================================================

  abrirDetalle(
    factura: FacturaAdmin
  ): void {

    this.facturaSeleccionada = factura;

  }


  cerrarDetalle(): void {

    this.facturaSeleccionada = null;

  }


  // ========================================================
  // 25. DESCARGAR PDF
  // ========================================================

  /*
    GET /api/facturas/{facturaId}/pdf

    ADMIN puede descargar cualquier factura.

    No vuelve a emitir ni modifica el comprobante.
  */

  descargarPdf(
    factura: FacturaAdmin
  ): void {

    if (this.descargandoId !== null) return;

    this.descargandoId = factura.id;

    this.mensaje = '';

    this.http.get(

      `${this.apiUrl}/facturas/${factura.id}/pdf`,

      {

        headers: this.obtenerHeaders(),

        responseType: 'blob'

      }

    ).pipe(

      timeout(30000)

    ).subscribe({

      next: archivo => {

        const url =
          window.URL.createObjectURL(archivo);

        const enlace =
          document.createElement('a');

        const nombre = (
          factura.numeroFactura ||
          `factura-${factura.id}`
        ).replace(/[^a-zA-Z0-9_-]/g, '_');

        enlace.href = url;

        enlace.download = `${nombre}.pdf`;

        document.body.appendChild(enlace);

        enlace.click();

        enlace.remove();

        window.setTimeout(
          () => window.URL.revokeObjectURL(url),
          1000
        );

        this.descargandoId = null;

        this.mostrarMensaje(
          'El comprobante PDF se descargó correctamente.',
          'exito'
        );

        this.cd.detectChanges();

      },

      error: err => {

        console.error(
          'Error descargando PDF:',
          err
        );

        this.descargandoId = null;

        this.mostrarMensaje(
          this.obtenerMensajeError(err),
          'error'
        );

        this.cd.detectChanges();

      }

    });

  }


  // ========================================================
  // 26. EXPORTAR RESULTADOS A CSV
  // ========================================================

  /*
    Exporta solamente las facturas visibles después
    de aplicar los filtros.
  */

  exportarCSV(): void {

    if (this.facturasFiltradas.length === 0) {

      this.mostrarMensaje(
        'No hay facturas para exportar.',
        'error'
      );

      return;

    }

    const encabezados = [

      'Número',

      'Fecha de emisión',

      'Propietario',

      'Correo',

      'Mascota',

      'Veterinario',

      'Servicio',

      'Subtotal',

      'Impuestos',

      'Total',

      'Estado',

      'Correo enviado'

    ];

    const filas = this.facturasFiltradas.map(f => [

      f.numeroFactura,

      this.mostrarFecha(f),

      f.nombreCliente,

      f.correoCliente,

      f.nombreMascota,

      f.nombreVeterinario,

      f.nombreServicio,

      this.numero(f.subtotal).toFixed(2),

      this.numero(f.impuestos).toFixed(2),

      this.numero(f.total).toFixed(2),

      f.estado,

      f.correoEnviado ? 'Sí' : 'No'

    ]);

    const escapar = (valor: unknown): string => {

      const texto = String(valor ?? '');

      // Evita que celdas de texto sean interpretadas
      // como fórmulas al abrir el CSV en Excel.

      const seguro = /^[=+\-@]/.test(texto)
        ? `'${texto}`
        : texto;

      return `"${seguro.replace(/"/g, '""')}"`;

    };

    const contenido = [

      encabezados,

      ...filas

    ]

      .map(fila =>
        fila.map(escapar).join(';')
      )

      .join('\r\n');

    const archivo = new Blob(

      ['\ufeff', contenido],

      {
        type: 'text/csv;charset=utf-8;'
      }

    );

    const url =
      window.URL.createObjectURL(archivo);

    const enlace =
      document.createElement('a');

    enlace.href = url;

    enlace.download =
      `facturas-administracion-${this.fechaActual()}.csv`;

    document.body.appendChild(enlace);

    enlace.click();

    enlace.remove();

    window.setTimeout(
      () => window.URL.revokeObjectURL(url),
      1000
    );

    this.mostrarMensaje(
      'El archivo CSV se exportó correctamente.',
      'exito'
    );

  }


  // ========================================================
  // 27. ESTADOS VISUALES
  // ========================================================

  claseEstado(
    estado: string | null | undefined
  ): string {

    const valor =
      (estado || '').toUpperCase();

    if (valor === 'EMITIDA') {

      return 'estado estado--emitida';

    }

    if (valor === 'PENDIENTE') {

      return 'estado estado--pendiente';

    }

    return 'estado estado--otro';

  }


  nombreEstado(
    estado: string | null | undefined
  ): string {

    return (estado || 'SIN ESTADO')
      .replace(/_/g, ' ');

  }


  // ========================================================
  // 28. MOSTRAR MENSAJES
  // ========================================================

  mostrarMensaje(
    texto: string,
    tipo: 'exito' | 'error'
  ): void {

    this.mensaje = texto;

    this.tipoMensaje = tipo;

  }


  // ========================================================
  // 29. IDENTIFICAR REGISTROS
  // ========================================================

  identificarFactura(
    _indice: number,
    factura: FacturaAdmin
  ): number {

    return factura.id;

  }


  // ========================================================
  // 30. PROCESAR ERRORES HTTP
  // ========================================================

  private obtenerMensajeError(err: any): string {

    if (err?.status === 0) {

      return 'No se pudo conectar con Spring Boot. Revisa Tailscale y el puerto 8080.';

    }

    if (err?.status === 401) {

      return 'Tu sesión expiró. Inicia sesión nuevamente.';

    }

    if (err?.status === 403) {

      return 'No tienes permisos para consultar todas las facturas.';

    }

    if (err?.status === 404) {

      return 'No se encontró la factura solicitada.';

    }

    return this.extraerMensaje(err) ||

      'Ocurrió un error. Actualiza los datos e inténtalo nuevamente.';

  }


  private extraerMensaje(err: any): string {

    const datos = err?.error;

    if (
      typeof datos === 'string' &&
      datos.trim()
    ) {

      return datos;

    }

    if (datos && typeof datos === 'object') {

      const mensaje =

        datos.mensaje ??

        datos.message ??

        datos.detail ??

        datos.error;

      if (
        typeof mensaje === 'string' &&
        mensaje.trim()
      ) {

        return mensaje;

      }

    }

    return '';

  }

}
