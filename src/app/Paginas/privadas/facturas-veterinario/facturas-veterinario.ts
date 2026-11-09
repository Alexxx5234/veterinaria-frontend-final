import { environment } from '../../../../environments/environment';
/* ==========================================================
   VETERINARIA ARÉVALO
   MÓDULO: FACTURAS DEL VETERINARIO

   FUNCIONES:
   - Consultar las facturas del veterinario autenticado.
   - Buscar por cliente, correo, mascota y número.
   - Filtrar por fecha y rango de fechas.
   - Filtrar por estado de factura.
   - Filtrar por estado del correo.
   - Mostrar indicadores de facturación.
   - Consultar el detalle de cada factura.
   - Descargar el PDF.
   - Enviar el PDF al correo del propietario.
   - Exportar los resultados filtrados a CSV.

   SEGURIDAD:
   - Utiliza el JWT de la sesión actual.
   - No envía el ID del veterinario.
   - El backend determina qué facturas puede consultar.
   - No modifica ni vuelve a emitir facturas.

   IMPORTANTE:
   Los comprobantes son documentos internos del proyecto.
   No sustituyen una factura electrónica autorizada por SRI.
========================================================== */

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

import {
  AuthServicio
} from '../../../Servicios/auth-servicio';


// ==========================================================
// 1. MODELOS DE INFORMACIÓN
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


// Respuesta real del servicio de correo del backend.
interface ResultadoEnvioFactura {

  facturaId: number;

  numeroFactura: string;

  correoDestinatario: string;

  correoEnviado: boolean;

  fechaEnvioCorreo?: string | null;

  mensaje: string;

}


// Modelo de filtros de búsqueda.
interface FiltrosFactura {

  busqueda: string;

  fecha: string;

  desde: string;

  hasta: string;

  estado: string;

  correo: string;

}


// ==========================================================
// 2. COMPONENTE ANGULAR
// ==========================================================

@Component({

  selector: 'app-facturas-veterinario',

  standalone: true,

  imports: [
    CommonModule,
    FormsModule
  ],

  templateUrl: './facturas-veterinario.html',

  styleUrl: './facturas-veterinario.scss'

})

export class FacturasVeterinario implements OnInit {


  // ========================================================
  // 3. CONFIGURACIÓN DEL BACKEND
  // ========================================================

  // Misma dirección utilizada por el módulo de medicamentos.
  private readonly apiUrl =
    environment.apiUrl;

  // Tiempo máximo de espera para consultar la información.
  private readonly tiempoMaximo = 25000;


  // ========================================================
  // 4. INFORMACIÓN DE FACTURAS
  // ========================================================

  facturas: FacturaVeterinario[] = [];

  facturasFiltradas: FacturaVeterinario[] = [];

  facturaSeleccionada: FacturaVeterinario | null = null;


  // ========================================================
  // 5. FILTROS
  // ========================================================

  filtros: FiltrosFactura = {

    busqueda: '',

    fecha: '',

    desde: '',

    hasta: '',

    estado: 'TODOS',

    correo: 'TODOS'

  };


  // ========================================================
  // 6. ESTADOS DE LA INTERFAZ
  // ========================================================

  cargando = false;

  error = '';

  mensaje = '';

  tipoMensaje: 'exito' | 'error' = 'exito';

  descargandoId: number | null = null;

  enviandoId: number | null = null;


  // ========================================================
  // 7. PAGINACIÓN
  // ========================================================

  paginaActual = 1;

  readonly tamanoPagina = 10;


  // ========================================================
  // 8. CONSTRUCTOR
  // ========================================================

  constructor(

    private http: HttpClient,

    private authServicio: AuthServicio,

    private cd: ChangeDetectorRef

  ) {}


  // ========================================================
  // 9. INICIALIZACIÓN
  // ========================================================

  ngOnInit(): void {

    this.cargarFacturas();

  }


  // ========================================================
  // 10. AUTENTICACIÓN JWT
  // ========================================================

  /**
   * Obtiene el token de la sesión actual.
   *
   * El backend utiliza este token para identificar
   * al veterinario que consulta sus facturas.
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
  // 11. CONSULTAR FACTURAS
  // ========================================================

  /**
   * GET /api/facturas/mis-facturas
   *
   * El backend devuelve:
   *
   * ADMIN:
   * Todas las facturas.
   *
   * VETERINARIO:
   * Facturas de sus propias atenciones.
   *
   * USER:
   * Facturas de sus mascotas.
   *
   * No se envía el ID del veterinario desde Angular.
   */

  cargarFacturas(): void {

    if (this.cargando) {
      return;
    }

    this.cargando = true;

    this.error = '';

    this.mensaje = '';

    this.http.get<FacturaVeterinario[]>(

      `${this.apiUrl}/facturas/mis-facturas`,

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
          'Error consultando facturas:',
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
  // 12. APLICAR FILTROS
  // ========================================================

  /**
   * Permite combinar diferentes criterios:
   *
   * - Número de factura.
   * - Nombre del propietario.
   * - Correo electrónico.
   * - Nombre de la mascota.
   * - Servicio.
   * - Número de atención.
   * - Fecha.
   * - Estado.
   */

  aplicarFiltros(): void {

    const texto = this.normalizar(
      this.filtros.busqueda
    );

    this.facturasFiltradas = this.facturas.filter(
      factura => {

        const fecha = this.fechaISO(factura);

        const textoFactura = this.normalizar([

          factura.numeroFactura,

          factura.nombreCliente,

          factura.correoCliente,

          factura.nombreMascota,

          factura.nombreServicio,

          factura.nombreVeterinario,

          factura.atencionId,

          factura.citaId

        ].join(' '));


        // Búsqueda por texto.
        if (
          texto &&
          !textoFactura.includes(texto)
        ) {

          return false;

        }


        // Fecha específica.
        if (
          this.filtros.fecha &&
          fecha !== this.filtros.fecha
        ) {

          return false;

        }


        // Fecha inicial.
        if (
          this.filtros.desde &&
          (!fecha || fecha < this.filtros.desde)
        ) {

          return false;

        }


        // Fecha final.
        if (
          this.filtros.hasta &&
          (!fecha || fecha > this.filtros.hasta)
        ) {

          return false;

        }


        // Estado de factura.
        const estado = (
          factura.estado || ''
        ).toUpperCase();

        if (
          this.filtros.estado !== 'TODOS' &&
          estado !== this.filtros.estado
        ) {

          return false;

        }


        // Estado del correo.
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
  // 13. LIMPIAR FILTROS
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
  // 14. FILTRAR FACTURAS DE HOY
  // ========================================================

  filtrarHoy(): void {

    this.limpiarFiltros();

    this.filtros.fecha = this.fechaActual();

    this.aplicarFiltros();

  }


  // ========================================================
  // 15. FILTRAR FACTURAS DEL MES
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
  // 16. NORMALIZAR TEXTO
  // ========================================================

  /**
   * Permite buscar sin importar:
   * - Mayúsculas.
   * - Minúsculas.
   * - Tildes.
   */

  private normalizar(valor: unknown): string {

    return String(valor ?? '')

      .trim()

      .toLocaleLowerCase('es-EC')

      .normalize('NFD')

      .replace(/[\u0300-\u036f]/g, '');

  }


  // ========================================================
  // 17. INDICADORES
  // ========================================================

  get totalFacturas(): number {

    return this.facturas.length;

  }


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


  get facturasHoy(): number {

    const hoy = this.fechaActual();

    return this.facturas.filter(

      factura => this.fechaISO(factura) === hoy

    ).length;

  }


  get correosPendientes(): number {

    return this.facturas.filter(

      factura => !factura.correoEnviado

    ).length;

  }


  get totalResultados(): number {

    return this.facturasFiltradas.length;

  }


  // ========================================================
  // 18. PAGINACIÓN
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


  get facturasPagina(): FacturaVeterinario[] {

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
  // 19. MANEJO DE FECHAS
  // ========================================================

  private obtenerFecha(
    factura: FacturaVeterinario
  ): Date | null {

    const valor =
      factura.fechaEmision ||
      factura.fechaCreacion;

    if (!valor) {

      return null;

    }

    const normalizado = valor.includes('T')

      ? valor

      : valor.replace(' ', 'T');

    const fecha = new Date(normalizado);

    return Number.isNaN(fecha.getTime())

      ? null

      : fecha;

  }


  private fechaISO(
    factura: FacturaVeterinario
  ): string {

    const fecha = this.obtenerFecha(factura);

    if (!fecha) {

      return '';

    }

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
    factura: FacturaVeterinario
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
    factura: FacturaVeterinario
  ): string {

    const fecha = this.obtenerFecha(factura);

    if (!fecha) {

      return 'No disponible';

    }

    return new Intl.DateTimeFormat(

      'es-EC',

      {

        day: '2-digit',

        month: 'short',

        year: 'numeric',

        hour: '2-digit',

        minute: '2-digit',

        hour12: false

      }

    ).format(fecha);

  }


  // ========================================================
  // 20. FORMATO MONETARIO
  // ========================================================

  formatoDinero(
    valor: number | string | null | undefined
  ): string {

    return new Intl.NumberFormat(

      'es-EC',

      {

        style: 'currency',

        currency: 'USD',

        minimumFractionDigits: 2,

        maximumFractionDigits: 2

      }

    ).format(this.numero(valor));

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
  // 21. VER DETALLE DE FACTURA
  // ========================================================

  abrirDetalle(
    factura: FacturaVeterinario
  ): void {

    this.facturaSeleccionada = factura;

  }


  cerrarDetalle(): void {

    this.facturaSeleccionada = null;

  }


  // ========================================================
  // 22. DESCARGAR PDF
  // ========================================================

  /**
   * GET /api/facturas/{facturaId}/pdf
   *
   * El backend verifica los permisos del usuario.
   */

  descargarPdf(
    factura: FacturaVeterinario
  ): void {

    if (this.descargandoId !== null) {

      return;

    }

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

          'El PDF se descargó correctamente.',

          'exito'

        );

        this.cd.detectChanges();

      },

      error: err => {

        console.error(
          'Error descargando factura:',
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
  // 23. ENVIAR FACTURA POR CORREO
  // ========================================================

  /**
   * POST /api/facturas/{facturaId}/enviar-correo
   *
   * El backend:
   * - Recupera el correo del propietario.
   * - Genera el PDF.
   * - Envía el documento.
   * - Registra la fecha del envío.
   *
   * No necesita un cuerpo JSON.
   */

  enviarCorreo(
    factura: FacturaVeterinario
  ): void {

    if (this.enviandoId !== null) {

      return;

    }

    if (factura.correoEnviado) {

      this.mostrarMensaje(

        'Esta factura ya figura como enviada.',

        'exito'

      );

      return;

    }

    if (!factura.correoCliente) {

      this.mostrarMensaje(

        'La factura no tiene un correo de propietario registrado.',

        'error'

      );

      return;

    }

    this.enviandoId = factura.id;

    this.mensaje = '';

    this.http.post<ResultadoEnvioFactura>(

      `${this.apiUrl}/facturas/${factura.id}/enviar-correo`,

      null,

      {

        headers: this.obtenerHeaders()

      }

    ).pipe(

      timeout(30000)

    ).subscribe({

      next: resultado => {

        this.enviandoId = null;

        if (resultado?.correoEnviado === true) {

          this.facturas = this.facturas.map(

            item => item.id === factura.id

              ? {
                  ...item,
                  correoEnviado: true
                }

              : item

          );

          this.aplicarFiltros();

          if (
            this.facturaSeleccionada?.id === factura.id
          ) {

            this.facturaSeleccionada = {

              ...this.facturaSeleccionada,

              correoEnviado: true

            };

          }

          this.mostrarMensaje(

            resultado.mensaje ||
            `El servidor de correo aceptó el envío a ${resultado.correoDestinatario}.`,

            'exito'

          );

        } else {

          this.mostrarMensaje(

            resultado?.mensaje ||
            'El backend no confirmó el envío del correo.',

            'error'

          );

        }

        this.cd.detectChanges();

      },

      error: err => {

        console.error(
          'Error enviando factura por correo:',
          err
        );

        this.enviandoId = null;

        this.mostrarMensaje(

          this.obtenerMensajeError(err),

          'error'

        );

        this.cd.detectChanges();

      }

    });

  }


  // ========================================================
  // 24. EXPORTAR FACTURAS A EXCEL/CSV
  // ========================================================

  /**
   * Exporta exclusivamente los resultados filtrados.
   */

  exportarCSV(): void {

    if (this.facturasFiltradas.length === 0) {

      this.mostrarMensaje(

        'No hay facturas para exportar con los filtros actuales.',

        'error'

      );

      return;

    }

    const encabezados = [

      'Número',

      'Fecha de emisión',

      'Cliente',

      'Correo',

      'Mascota',

      'Servicio',

      'Subtotal',

      'Impuestos',

      'Total',

      'Estado',

      'Correo enviado'

    ];

    const filas = this.facturasFiltradas.map(

      factura => [

        factura.numeroFactura,

        this.mostrarFecha(factura),

        factura.nombreCliente,

        factura.correoCliente,

        factura.nombreMascota,

        factura.nombreServicio,

        this.numero(factura.subtotal).toFixed(2),

        this.numero(factura.impuestos).toFixed(2),

        this.numero(factura.total).toFixed(2),

        factura.estado,

        factura.correoEnviado ? 'Sí' : 'No'

      ]

    );

    const escapar = (valor: unknown): string =>

      `"${String(valor ?? '').replace(/"/g, '""')}"`;

    const contenido = [

      encabezados,

      ...filas

    ]

      .map(fila => fila.map(escapar).join(';'))

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
      `facturas-veterinario-${this.fechaActual()}.csv`;

    document.body.appendChild(enlace);

    enlace.click();

    enlace.remove();

    window.setTimeout(

      () => window.URL.revokeObjectURL(url),

      1000

    );

  }


  // ========================================================
  // 25. ESTADOS VISUALES
  // ========================================================

  claseEstado(
    estado: string | null | undefined
  ): string {

    const valor = (estado || '').toUpperCase();

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
  // 26. MENSAJES
  // ========================================================

  mostrarMensaje(
    texto: string,
    tipo: 'exito' | 'error'
  ): void {

    this.mensaje = texto;

    this.tipoMensaje = tipo;

  }


  // ========================================================
  // 27. IDENTIFICAR REGISTROS
  // ========================================================

  identificarFactura(
    _indice: number,
    factura: FacturaVeterinario
  ): number {

    return factura.id;

  }


  // ========================================================
  // 28. MANEJO DE ERRORES HTTP
  // ========================================================

  private obtenerMensajeError(err: any): string {

    if (err?.status === 0) {

      return 'No se pudo conectar con Spring Boot. Revisa Tailscale y el puerto 8080.';

    }

    if (err?.status === 401) {

      return 'Tu sesión expiró. Inicia sesión nuevamente.';

    }

    if (err?.status === 403) {

      return 'No tienes permisos para consultar o realizar esta operación.';

    }

    if (err?.status === 404) {

      return 'No se encontró la factura solicitada.';

    }

    if (err?.status === 409) {

      return this.extraerMensaje(err) ||
        'La factura no se encuentra en un estado válido para esta operación.';

    }

    if (err?.status === 503) {

      return this.extraerMensaje(err) ||
        'El servicio de correo no está disponible.';

    }

    return this.extraerMensaje(err) ||

      'Ocurrió un error. Actualiza la información e inténtalo nuevamente.';

  }


  private extraerMensaje(err: any): string {

    const datos = err?.error;

    if (
      typeof datos === 'string' &&
      datos.trim()
    ) {

      return datos;

    }

    if (
      datos &&
      typeof datos === 'object'
    ) {

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