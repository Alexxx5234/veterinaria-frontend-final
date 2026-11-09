import { environment } from '../../../../environments/environment';

/*
   VETERINARIA ARÉVALO
   MEDICAMENTOS DE LA ATENCIÓN Y FACTURACIÓN
   COMPONENTE DEL ROL VETERINARIO

   FUNCIONES:
   - Consulta las atenciones del veterinario autenticado.
   - Consulta el catálogo completo, incluidos inactivos.
   - Permite seleccionar solo medicamentos activos.
   - Registra UTILIZADO, RECETADO y RECETADO_ENTREGADO.
   - Permite registrar varios medicamentos en un lote.
   - Conserva compatibilidad con la plantilla anterior que
     utiliza solicitarRegistro/confirmarRegistro.
   - Permite continuar directamente a factura sin medicamentos.
   - Previsualiza y emite la factura desde Spring Boot.
   - Descarga el PDF y lo envía al correo del propietario.

   SEGURIDAD:
   - La identidad del veterinario se obtiene del JWT.
   - Angular no envía veterinarioId, precios ni stock.
   - Spring Boot valida permisos, importes e inventario.
========================================================== */

import { Component, ChangeDetectorRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';
import { AuthServicio } from '../../../Servicios/auth-servicio';

// 1. MODELOS DEL BACKEND

type TipoRegistro = 'UTILIZADO' | 'RECETADO' | 'RECETADO_ENTREGADO';
type OpcionMedicamentos = 'SI' | 'NO' | null;
type ValorNumerico = number | string;

interface AtencionResumen {
  id: number;
  citaId?: number;
  nombreMascota?: string;
  fechaAtencion?: string;
}

interface MedicamentoCatalogo {
  id: number;
  nombre: string;
  descripcion?: string;
  presentacion?: string;
  concentracion?: string;
  unidadMedida?: string;
  stockDisponible?: ValorNumerico | null;
  precioUnitario?: ValorNumerico | null;
  activo?: boolean;
}

interface DetalleMedicamento {
  id: number;
  atencionId: number;
  medicamentoId: number;
  tipoRegistro: TipoRegistro;
  nombreMedicamento: string;
  unidadMedida: string;
  cantidad: ValorNumerico;
  precioUnitarioAplicado: ValorNumerico;
  subtotal: ValorNumerico;
  indicaciones?: string | null;
  fechaRegistro?: string;
}

interface MedicamentoPendiente {
  medicamentoId: number;
  nombre: string;
  unidadMedida: string;
  cantidad: number;
  tipoRegistro: TipoRegistro;
  indicaciones: string;
}

interface LineaMedicamentoFactura {
  detalleId: number;
  medicamentoId: number;
  nombreMedicamento: string;
  unidadMedida: string;
  tipoRegistro: TipoRegistro;
  cantidad: ValorNumerico;
  precioUnitario: ValorNumerico;
  subtotal: ValorNumerico;
  indicaciones?: string | null;
}

interface VistaPreviaFactura {
  atencionId: number;
  citaId: number;
  nombreCliente: string;
  correoCliente: string;
  nombreMascota: string;
  nombreVeterinario: string;
  nombreServicio: string;
  precioServicio: ValorNumerico;
  medicamentos: LineaMedicamentoFactura[];
  totalMedicamentos: ValorNumerico;
  subtotal: ValorNumerico;
  impuestos: ValorNumerico;
  total: ValorNumerico;
  yaEmitida: boolean;
}

interface FacturaEmitida {
  id: number;
  numeroFactura: string;
  atencionId: number;
  citaId: number;
  nombreCliente: string;
  correoCliente: string;
  nombreMascota: string;
  nombreVeterinario: string;
  nombreServicio: string;
  precioServicio: ValorNumerico;
  medicamentos: LineaMedicamentoFactura[];
  totalMedicamentos: ValorNumerico;
  subtotal: ValorNumerico;
  impuestos: ValorNumerico;
  total: ValorNumerico;
  estado: string;
  correoEnviado: boolean;
  fechaCreacion?: string;
  fechaEmision?: string;
}

interface ResultadoEnvioFactura {
  facturaId: number;
  numeroFactura: string;
  correoDestinatario: string;
  correoEnviado: boolean;
  fechaEnvioCorreo?: string;
  mensaje: string;
}

// 2. COMPONENTE ANGULAR

@Component({
  selector: 'app-medicamentos-atencion-veterinario',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './medicamentos-atencion-veterinario.html',
  styleUrl: './medicamentos-atencion-veterinario.scss'
})
export class MedicamentosAtencionVeterinario implements OnInit {

  // Mantiene la dirección Tailscale configurada en el proyecto.
  private readonly apiUrl = environment.apiUrl;
  private readonly tiempoMaximo = 20000;
  private readonly tiempoRegistro = 45000;

  // Identifica y descarta respuestas antiguas del historial.
  private numeroSolicitudDetalles = 0;
  private atencionPreseleccionada: number | null = null;

  // Formulario compartido por las dos versiones de la plantilla.
  formulario: FormGroup;

  // Datos recibidos desde Spring Boot.
  atenciones: AtencionResumen[] = [];
  medicamentos: MedicamentoCatalogo[] = [];
  detalles: DetalleMedicamento[] = [];

  // Lista temporal para la plantilla que registra varios medicamentos.
  pendientes: MedicamentoPendiente[] = [];

  // Estado del flujo de medicamentos y facturación.
  opcionMedicamentos: OpcionMedicamentos = null;
  vistaPreviaFactura: VistaPreviaFactura | null = null;
  facturaEmitida: FacturaEmitida | null = null;

  // Indicadores de carga.
  cargandoDatos = false;
  cargandoCatalogo = false;
  cargandoDetalles = false;
  cargandoFactura = false;
  guardando = false;
  emitiendoFactura = false;
  descargandoPdf = false;
  enviandoCorreo = false;

  // Indicadores de resultado y errores.
  catalogoCargado = false;
  detallesListos = false;
  errorAtenciones = false;
  errorCatalogo = false;
  errorDetalles = false;
  confirmarGuardado = false;

  mensajeError = '';
  mensajeExito = '';
  mensajeCorreo = '';

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private authServicio: AuthServicio,
    private ruta: ActivatedRoute,
    private cd: ChangeDetectorRef
  ) {
    this.formulario = this.fb.group({
      atencionId: [null, Validators.required],
      medicamentoId: [null, Validators.required],
      tipoRegistro: ['UTILIZADO', Validators.required],
      cantidad: ['', Validators.required],
      indicaciones: ['', Validators.maxLength(1000)]
    });
  }

  // 3. INICIALIZACIÓN Y AUTENTICACIÓN

  ngOnInit(): void {
    const parametro = this.ruta.snapshot.queryParamMap.get('atencionId');
    const id = parametro === null ? NaN : Number(parametro);

    if (Number.isSafeInteger(id) && id > 0) {
      this.atencionPreseleccionada = id;
    }

    this.cargarDatos();
  }

  /** Construye el encabezado JWT. No envía IDs de usuario desde Angular. */
  private obtenerHeaders(): HttpHeaders {
    const token = this.authServicio.obtenerToken();
    return token
      ? new HttpHeaders({ Authorization: `Bearer ${token}` })
      : new HttpHeaders();
  }

  // 4. GETTERS UTILIZADOS POR LAS PLANTILLAS

  get atencionSeleccionada(): AtencionResumen | undefined {
    const id = Number(this.formulario.get('atencionId')?.value);
    return this.atenciones.find(atencion => atencion.id === id);
  }

  get medicamentoSeleccionado(): MedicamentoCatalogo | undefined {
    const id = Number(this.formulario.get('medicamentoId')?.value);
    return this.medicamentos.find(medicamento => medicamento.id === id);
  }

  get totalActivos(): number {
    return this.medicamentos.filter(medicamento => medicamento.activo === true).length;
  }

  // 5. CARGAR ATENCIONES Y CATÁLOGO

  cargarDatos(): void {
    if (this.cargandoDatos || this.guardando) return;

    this.cargandoDatos = true;
    this.errorAtenciones = false;
    this.errorCatalogo = false;
    this.mensajeError = '';

    const headers = this.obtenerHeaders();

    forkJoin({
      atenciones: this.http.get<AtencionResumen[]>(
        `${this.apiUrl}/atenciones-medicas/mis-atenciones`,
        { headers }
      ).pipe(
        timeout(this.tiempoMaximo),
        catchError(error => {
          console.error('Error consultando atenciones:', error);
          return of(null);
        })
      ),
      medicamentos: this.http.get<MedicamentoCatalogo[]>(
        `${this.apiUrl}/medicamentos`,
        { headers }
      ).pipe(
        timeout(this.tiempoMaximo),
        catchError(error => {
          console.error('Error consultando catálogo:', error);
          return of(null);
        })
      )
    }).subscribe({
      next: ({ atenciones, medicamentos }) => {
        this.errorAtenciones = !Array.isArray(atenciones);
        this.errorCatalogo = !Array.isArray(medicamentos);

        this.atenciones = Array.isArray(atenciones)
          ? [...atenciones].sort((a, b) => b.id - a.id)
          : [];

        this.medicamentos = Array.isArray(medicamentos)
          ? [...medicamentos].sort((a, b) =>
              (a.nombre ?? '').localeCompare(b.nombre ?? '', 'es')
            )
          : [];

        this.catalogoCargado = Array.isArray(medicamentos);
        this.cargandoCatalogo = false;

        // Conserva una atención elegida o recibida por query param.
        const actual = Number(this.formulario.get('atencionId')?.value);
        const deseada = this.atencionPreseleccionada ?? actual;
        const existe = Number.isSafeInteger(deseada)
          && this.atenciones.some(atencion => atencion.id === deseada);

        if (!this.errorAtenciones && existe) {
          this.formulario.patchValue({ atencionId: deseada });
          this.atencionPreseleccionada = null;
          this.seleccionarAtencion();
        } else {
          this.limpiarAtencion();
        }

        if (this.errorAtenciones || this.errorCatalogo) {
          this.mensajeError = 'No se pudo consultar toda la información. Revisa la conexión y tus permisos.';
        }

        this.cargandoDatos = false;
        this.cd.detectChanges();
      },
      error: error => {
        console.error('Error general cargando el módulo:', error);
        this.cargandoDatos = false;
        this.errorAtenciones = true;
        this.errorCatalogo = true;
        this.mensajeError = this.obtenerErrorBackend(error);
        this.cd.detectChanges();
      }
    });
  }

  /** Permite volver a consultar el catálogo cuando falla su carga. */
  reintentarCatalogo(): void {
    if (this.cargandoCatalogo || this.guardando) return;

    this.cargandoCatalogo = true;
    this.catalogoCargado = false;
    this.errorCatalogo = false;

    this.http.get<MedicamentoCatalogo[]>(
      `${this.apiUrl}/medicamentos`,
      { headers: this.obtenerHeaders() }
    ).pipe(timeout(this.tiempoMaximo)).subscribe({
      next: datos => {
        this.medicamentos = Array.isArray(datos)
          ? [...datos].sort((a, b) =>
              (a.nombre ?? '').localeCompare(b.nombre ?? '', 'es')
            )
          : [];
        this.catalogoCargado = Array.isArray(datos);
        this.errorCatalogo = !Array.isArray(datos);
        this.cargandoCatalogo = false;
        this.cd.detectChanges();
      },
      error: error => {
        console.error('Error actualizando catálogo:', error);
        this.errorCatalogo = true;
        this.catalogoCargado = false;
        this.cargandoCatalogo = false;
        this.mensajeError = this.obtenerErrorBackend(error);
        this.cd.detectChanges();
      }
    });
  }

  // 6. CAMBIAR Y LIMPIAR ATENCIÓN

  /** Método utilizado por la plantilla simplificada con select [value]. */
  cambiarAtencion(valor: string | number | null): void {
    const id = valor === null || valor === '' ? null : Number(valor);
    this.formulario.patchValue({ atencionId: id });
    this.seleccionarAtencion();
  }

  /** Método utilizado por la plantilla anterior con formControlName. */
  seleccionarAtencion(): void {
    this.numeroSolicitudDetalles++;
    this.detalles = [];
    this.pendientes = [];
    this.detallesListos = false;
    this.errorDetalles = false;
    this.opcionMedicamentos = null;
    this.confirmarGuardado = false;
    this.vistaPreviaFactura = null;
    this.facturaEmitida = null;
    this.mensajeError = '';
    this.mensajeExito = '';
    this.mensajeCorreo = '';

    this.formulario.patchValue({
      medicamentoId: null,
      tipoRegistro: 'UTILIZADO',
      cantidad: '',
      indicaciones: ''
    });

    const atencionId = Number(this.formulario.get('atencionId')?.value);
    if (!Number.isSafeInteger(atencionId) || atencionId <= 0) {
      this.cargandoDetalles = false;
      return;
    }

    this.cargarDetalles();
  }

  private limpiarAtencion(): void {
    this.numeroSolicitudDetalles++;
    this.formulario.patchValue({
      atencionId: null,
      medicamentoId: null,
      tipoRegistro: 'UTILIZADO',
      cantidad: '',
      indicaciones: ''
    });
    this.detalles = [];
    this.pendientes = [];
    this.detallesListos = false;
    this.cargandoDetalles = false;
    this.errorDetalles = false;
    this.opcionMedicamentos = null;
    this.confirmarGuardado = false;
    this.vistaPreviaFactura = null;
    this.facturaEmitida = null;
  }

  // 7. CONSULTAR HISTORIAL DE LA ATENCIÓN

  cargarDetalles(): void {
    const atencionId = Number(this.formulario.get('atencionId')?.value);
    const solicitud = ++this.numeroSolicitudDetalles;

    this.detalles = [];
    this.detallesListos = false;
    this.errorDetalles = false;

    if (
      !Number.isSafeInteger(atencionId) ||
      atencionId <= 0 ||
      !this.atenciones.some(atencion => atencion.id === atencionId)
    ) {
      this.cargandoDetalles = false;
      return;
    }

    this.cargandoDetalles = true;

    this.http.get<DetalleMedicamento[]>(
      `${this.apiUrl}/detalles-medicamentos-atencion/atencion/${atencionId}`,
      { headers: this.obtenerHeaders() }
    ).pipe(timeout(this.tiempoMaximo)).subscribe({
      next: datos => {
        if (solicitud !== this.numeroSolicitudDetalles) return;

        this.detalles = Array.isArray(datos) ? datos : [];
        this.detallesListos = Array.isArray(datos);
        this.errorDetalles = !Array.isArray(datos);
        this.cargandoDetalles = false;
        this.cd.detectChanges();
      },
      error: error => {
        if (solicitud !== this.numeroSolicitudDetalles) return;

        console.error('Error consultando historial:', error);
        this.errorDetalles = true;
        this.detallesListos = false;
        this.cargandoDetalles = false;
        this.mensajeError = 'No se pudo verificar el historial de esta atención. Actualiza los datos antes de continuar.';
        this.cd.detectChanges();
      }
    });
  }

  // 8. REGLAS DE INVENTARIO Y CATÁLOGO

  /** Los inactivos se muestran en el catálogo, pero no se seleccionan. */
  disponibleParaSeleccion(medicamento: MedicamentoCatalogo): boolean {
    return medicamento.activo === true;
  }

  /**
   * Permite ambas llamadas:
   * tipoConDescuento() desde el HTML y tipoConDescuento('UTILIZADO')
   * desde las validaciones del TypeScript.
   * No se utiliza una aserción `as TipoRegistro` para evitar el error
   * de sintaxis que apareció al separar `as` en otra línea.
   */
  tipoConDescuento(tipo?: TipoRegistro | null): boolean {
    const tipoSeleccionado = tipo ?? this.formulario.get('tipoRegistro')?.value;
    return tipoSeleccionado === 'UTILIZADO'
      || tipoSeleccionado === 'RECETADO_ENTREGADO';
  }

  descripcionTipo(tipo: TipoRegistro | string | null | undefined): string {
    switch (tipo) {
      case 'UTILIZADO':
        return 'Utilizado durante la atención';
      case 'RECETADO':
        return 'Solo recetado (sin cobro ni descuento)';
      case 'RECETADO_ENTREGADO':
        return 'Recetado y entregado al propietario';
      default:
        return 'Tipo de registro no especificado';
    }
  }

  numero(valor: ValorNumerico | null | undefined): number {
    const resultado = Number(valor ?? 0);
    return Number.isFinite(resultado) ? resultado : 0;
  }

  identificarAtencion(_indice: number, item: AtencionResumen): number {
    return item.id;
  }

  identificarMedicamento(_indice: number, item: MedicamentoCatalogo): number {
    return item.id;
  }

  identificarDetalle(_indice: number, item: DetalleMedicamento): number {
    return item.id;
  }

  // 9. SELECCIÓN DE SI/NO NECESITA MEDICAMENTOS

  cambiarNecesitaMedicamentos(opcion: 'SI' | 'NO'): void {
    if (!this.atencionSeleccionada || !this.detallesListos || this.guardando) return;

    if (opcion === 'NO' && this.pendientes.length > 0) {
      this.opcionMedicamentos = 'SI';
      this.mensajeError = 'Primero guarda o retira los medicamentos pendientes.';
      return;
    }

    this.opcionMedicamentos = opcion;
    this.mensajeError = '';
    this.mensajeExito = '';
    this.vistaPreviaFactura = null;
    this.facturaEmitida = null;

    if (opcion === 'NO') {
      this.formulario.patchValue({
        medicamentoId: null,
        cantidad: '',
        indicaciones: ''
      });
    } else if (!this.catalogoCargado) {
      this.reintentarCatalogo();
    }

    this.cd.detectChanges();
  }

  // 10. VALIDAR DATOS DE UN MEDICAMENTO

  private obtenerDatosMedicamento(): MedicamentoPendiente | null {
    this.formulario.get('medicamentoId')?.markAsTouched();
    this.formulario.get('tipoRegistro')?.markAsTouched();
    this.formulario.get('cantidad')?.markAsTouched();

    const medicamento = this.medicamentoSeleccionado;
    const medicamentoId = Number(this.formulario.get('medicamentoId')?.value);
    const tipo = this.formulario.get('tipoRegistro')?.value as TipoRegistro;
    const cantidadTexto = String(this.formulario.get('cantidad')?.value ?? '')
      .trim()
      .replace(',', '.');
    const cantidad = Number(cantidadTexto);
    const indicaciones = String(this.formulario.get('indicaciones')?.value ?? '').trim();

    if (!medicamento || !Number.isSafeInteger(medicamentoId)) {
      this.mensajeError = 'Selecciona un medicamento del catálogo.';
      return null;
    }

    if (!this.disponibleParaSeleccion(medicamento)) {
      this.mensajeError = 'El medicamento está inactivo y no se puede seleccionar.';
      return null;
    }

    if (!['UTILIZADO', 'RECETADO', 'RECETADO_ENTREGADO'].includes(tipo)) {
      this.mensajeError = 'Selecciona un tipo de registro válido.';
      return null;
    }

    if (
      !/^(?:\d{1,10})(?:\.\d{1,2})?$/.test(cantidadTexto) ||
      !Number.isFinite(cantidad) ||
      cantidad < 0.01
    ) {
      this.mensajeError = 'La cantidad debe ser mayor que cero y tener máximo dos decimales.';
      return null;
    }

    return {
      medicamentoId,
      nombre: medicamento.nombre,
      unidadMedida: medicamento.unidadMedida || 'Unidad',
      cantidad,
      tipoRegistro: tipo,
      indicaciones
    };
  }

  private validarStockPendiente(item: MedicamentoPendiente): boolean {
    if (!this.tipoConDescuento(item.tipoRegistro)) return true;

    const medicamento = this.medicamentos.find(m => m.id === item.medicamentoId);
    const stock = medicamento?.stockDisponible;
    if (stock == null || !Number.isFinite(Number(stock))) return false;

    const yaPendiente = this.pendientes
      .filter(p => p.medicamentoId === item.medicamentoId && this.tipoConDescuento(p.tipoRegistro))
      .reduce((total, p) => total + p.cantidad, 0);

    return item.cantidad + yaPendiente <= Number(stock);
  }

  // 11. PLANTILLA SIMPLIFICADA: AGREGAR VARIOS MEDICAMENTOS

  agregarMedicamento(): void {
    this.mensajeError = '';
    this.mensajeExito = '';

    if (
      this.guardando ||
      !this.atencionSeleccionada ||
      !this.detallesListos ||
      this.errorDetalles ||
      this.opcionMedicamentos !== 'SI'
    ) {
      this.mensajeError = 'Selecciona una atención y verifica su historial antes de agregar medicamentos.';
      return;
    }

    const item = this.obtenerDatosMedicamento();
    if (!item) return;

    const duplicadoEnHistorial = this.detalles.some(detalle =>
      detalle.medicamentoId === item.medicamentoId && detalle.tipoRegistro === item.tipoRegistro
    );
    const duplicadoPendiente = this.pendientes.some(pendiente =>
      pendiente.medicamentoId === item.medicamentoId && pendiente.tipoRegistro === item.tipoRegistro
    );

    if (duplicadoEnHistorial || duplicadoPendiente) {
      this.mensajeError = 'Ese medicamento ya está registrado o pendiente con el mismo tipo.';
      return;
    }

    if (!this.validarStockPendiente(item)) {
      this.mensajeError = 'No hay stock suficiente para la cantidad indicada.';
      return;
    }

    this.pendientes = [...this.pendientes, item];
    this.formulario.patchValue({ medicamentoId: null, cantidad: '', indicaciones: '' });
    this.mensajeExito = 'Medicamento agregado a la lista. Todavía debes guardar la lista.';
    this.cd.detectChanges();
  }

  quitarPendiente(indice: number): void {
    if (this.guardando || indice < 0 || indice >= this.pendientes.length) return;
    this.pendientes = this.pendientes.filter((_item, i) => i !== indice);
    this.mensajeError = '';
    this.mensajeExito = 'Medicamento retirado de la lista pendiente.';
  }

  guardarMedicamentos(): void {
    const atencionId = Number(this.formulario.get('atencionId')?.value);

    if (
      this.guardando ||
      !Number.isSafeInteger(atencionId) ||
      atencionId <= 0 ||
      !this.atencionSeleccionada ||
      !this.detallesListos ||
      this.errorDetalles ||
      this.pendientes.length === 0
    ) {
      this.mensajeError = 'Verifica la atención y agrega al menos un medicamento antes de guardar.';
      return;
    }

    this.guardando = true;
    this.mensajeError = '';
    this.mensajeExito = '';

    const cuerpo = {
      atencionId,
      medicamentos: this.pendientes.map(item => ({
        medicamentoId: item.medicamentoId,
        tipoRegistro: item.tipoRegistro,
        cantidad: item.cantidad,
        indicaciones: item.indicaciones || null
      }))
    };

    // El endpoint /lote guarda todo en una transacción.
    this.http.post<DetalleMedicamento[]>(
      `${this.apiUrl}/detalles-medicamentos-atencion/lote`,
      cuerpo,
      { headers: this.obtenerHeaders() }
    ).pipe(timeout(this.tiempoRegistro)).subscribe({
      next: respuesta => {
        this.guardando = false;
        this.pendientes = [];
        this.mensajeExito = Array.isArray(respuesta)
          ? `${respuesta.length} medicamento(s) registrado(s) correctamente.`
          : 'Medicamentos registrados correctamente.';
        this.cargarDetalles();
        this.reintentarCatalogo();
        this.cd.detectChanges();
      },
      error: error => {
        this.guardando = false;
        console.error('Error guardando lote de medicamentos:', error);
        this.mensajeError = error?.name === 'TimeoutError'
          ? 'La respuesta tardó demasiado. Actualiza el historial antes de volver a guardar para evitar duplicados.'
          : this.obtenerErrorBackend(error);
        this.cd.detectChanges();
      }
    });
  }

  // 12. COMPATIBILIDAD CON LA PLANTILLA ANTERIOR

  /** Valida el formulario anterior y abre su ventana de confirmación. */
  solicitarRegistro(): void {
    this.mensajeError = '';
    this.mensajeExito = '';

    if (
      this.guardando ||
      this.cargandoDatos ||
      this.cargandoDetalles ||
      this.errorAtenciones ||
      this.errorCatalogo ||
      this.errorDetalles ||
      !this.detallesListos
    ) {
      this.mensajeError = 'Primero deben cargarse correctamente el catálogo y el historial de la atención.';
      return;
    }

    this.formulario.markAllAsTouched();

    const atencionId = Number(this.formulario.get('atencionId')?.value);
    if (
      !Number.isSafeInteger(atencionId) ||
      !this.atenciones.some(atencion => atencion.id === atencionId) ||
      this.formulario.get('medicamentoId')?.invalid ||
      this.formulario.get('cantidad')?.invalid
    ) {
      this.mensajeError = 'Selecciona una atención, un medicamento y completa los campos obligatorios.';
      return;
    }

    const item = this.obtenerDatosMedicamento();
    if (!item) return;

    const duplicado = this.detalles.some(detalle =>
      detalle.medicamentoId === item.medicamentoId && detalle.tipoRegistro === item.tipoRegistro
    );
    if (duplicado) {
      this.mensajeError = 'Este medicamento ya se registró con el mismo tipo en esta atención.';
      return;
    }

    if (!this.validarStockPendiente(item)) {
      this.mensajeError = 'No hay existencias suficientes para utilizar o entregar esa cantidad.';
      return;
    }

    this.confirmarGuardado = true;
    this.cd.detectChanges();
  }

  cancelarConfirmacion(): void {
    if (!this.guardando) this.confirmarGuardado = false;
  }

  /** Confirma y registra un único medicamento desde la plantilla anterior. */
  confirmarRegistro(): void {
    if (!this.confirmarGuardado || this.guardando) return;

    const atencionId = Number(this.formulario.get('atencionId')?.value);
    const item = this.obtenerDatosMedicamento();
    if (!item || !Number.isSafeInteger(atencionId) || atencionId <= 0) {
      this.confirmarGuardado = false;
      return;
    }

    const duplicado = this.detalles.some(detalle =>
      detalle.medicamentoId === item.medicamentoId && detalle.tipoRegistro === item.tipoRegistro
    );
    if (duplicado || !this.validarStockPendiente(item)) {
      this.confirmarGuardado = false;
      this.mensajeError = 'Los datos cambiaron. Actualiza el historial y vuelve a intentarlo.';
      return;
    }

    this.confirmarGuardado = false;
    this.guardando = true;
    this.mensajeError = '';

    const cuerpo = {
      atencionId,
      medicamentoId: item.medicamentoId,
      tipoRegistro: item.tipoRegistro,
      cantidad: item.cantidad,
      indicaciones: item.indicaciones || null
    };

    // Endpoint individual que también conserva el backend.
    this.http.post<DetalleMedicamento>(
      `${this.apiUrl}/detalles-medicamentos-atencion`,
      cuerpo,
      { headers: this.obtenerHeaders() }
    ).pipe(timeout(this.tiempoMaximo)).subscribe({
      next: () => {
        this.guardando = false;
        this.formulario.patchValue({
          medicamentoId: null,
          tipoRegistro: 'UTILIZADO',
          cantidad: '',
          indicaciones: ''
        });
        this.mensajeExito = 'Medicamento registrado correctamente. Se actualizó el historial y el inventario según el tipo.';
        this.cargarDetalles();
        this.reintentarCatalogo();
        this.cd.detectChanges();
      },
      error: error => {
        this.guardando = false;
        console.error('Error registrando medicamento:', error);
        this.mensajeError = error?.name === 'TimeoutError'
          ? 'La respuesta tardó demasiado. Actualiza el historial antes de volver a guardar.'
          : this.obtenerErrorBackend(error);
        this.cd.detectChanges();
      }
    });
  }

  // 13. CONTINUAR DIRECTAMENTE A FACTURACIÓN

  continuarAFactura(): void {
    const atencionId = Number(this.formulario.get('atencionId')?.value);

    if (
      !Number.isSafeInteger(atencionId) ||
      atencionId <= 0 ||
      !this.atencionSeleccionada
    ) {
      this.mensajeError = 'Selecciona una atención médica válida.';
      return;
    }

    if (this.guardando || this.cargandoDetalles || !this.detallesListos || this.errorDetalles) {
      this.mensajeError = 'Espera a que se verifique el historial de medicamentos.';
      return;
    }

    if (this.pendientes.length > 0) {
      this.mensajeError = 'Primero guarda o retira los medicamentos pendientes.';
      return;
    }

    this.cargandoFactura = true;
    this.vistaPreviaFactura = null;
    this.facturaEmitida = null;
    this.mensajeError = '';
    this.mensajeExito = '';
    this.mensajeCorreo = '';

    // Spring calcula servicio, medicamentos, impuestos y total.
    // Si no existen medicamentos, la factura incluye solo el servicio.
    this.http.get<VistaPreviaFactura>(
      `${this.apiUrl}/facturas/previsualizar/${atencionId}`,
      { headers: this.obtenerHeaders() }
    ).pipe(timeout(this.tiempoMaximo)).subscribe({
      next: vista => {
        if (vista.yaEmitida) {
          this.cargarFacturaExistente(atencionId);
          return;
        }
        this.vistaPreviaFactura = {
          ...vista,
          medicamentos: Array.isArray(vista.medicamentos) ? vista.medicamentos : []
        };
        this.cargandoFactura = false;
        this.cd.detectChanges();
      },
      error: error => {
        console.error('Error consultando vista previa:', error);
        this.cargandoFactura = false;
        this.mensajeError = this.obtenerErrorBackend(error);
        this.cd.detectChanges();
      }
    });
  }

  private cargarFacturaExistente(atencionId: number): void {
    this.http.get<FacturaEmitida>(
      `${this.apiUrl}/facturas/atencion/${atencionId}`,
      { headers: this.obtenerHeaders() }
    ).pipe(timeout(this.tiempoMaximo)).subscribe({
      next: factura => {
        this.facturaEmitida = {
          ...factura,
          medicamentos: Array.isArray(factura.medicamentos) ? factura.medicamentos : []
        };
        this.vistaPreviaFactura = null;
        this.cargandoFactura = false;
        this.mensajeExito = 'Esta atención ya tiene una factura emitida. Se recuperó el comprobante existente.';
        this.cd.detectChanges();
      },
      error: error => {
        this.cargandoFactura = false;
        this.mensajeError = this.obtenerErrorBackend(error);
        this.cd.detectChanges();
      }
    });
  }

  volverASeleccion(): void {
    if (this.emitiendoFactura || this.enviandoCorreo || this.descargandoPdf) return;
    this.vistaPreviaFactura = null;
    this.mensajeError = '';
    this.mensajeCorreo = '';
  }

  // 14. EMITIR FACTURA

  emitirFactura(): void {
    if (!this.vistaPreviaFactura || this.emitiendoFactura) return;

    if (this.vistaPreviaFactura.yaEmitida) {
      this.mensajeError = 'Esta atención ya tiene una factura emitida.';
      return;
    }

    const atencionId = this.vistaPreviaFactura.atencionId;
    this.emitiendoFactura = true;
    this.mensajeError = '';

    this.http.post<FacturaEmitida>(
      `${this.apiUrl}/facturas/emitir/${atencionId}`,
      null,
      { headers: this.obtenerHeaders() }
    ).pipe(timeout(30000)).subscribe({
      next: factura => {
        this.facturaEmitida = {
          ...factura,
          medicamentos: Array.isArray(factura.medicamentos) ? factura.medicamentos : []
        };
        this.vistaPreviaFactura = null;
        this.emitiendoFactura = false;
        this.mensajeExito = 'Factura emitida correctamente. Ya puedes descargar el PDF o enviarlo al propietario.';
        this.cd.detectChanges();
      },
      error: error => {
        console.error('Error emitiendo factura:', error);
        this.emitiendoFactura = false;
        this.mensajeError = this.obtenerErrorBackend(error);
        this.cd.detectChanges();
      }
    });
  }

  // 15. DESCARGAR PDF DE LA FACTURA

  descargarPdf(): void {
    if (!this.facturaEmitida || this.descargandoPdf) return;

    const factura = this.facturaEmitida;
    this.descargandoPdf = true;
    this.mensajeError = '';

    this.http.get(
      `${this.apiUrl}/facturas/${factura.id}/pdf`,
      {
        headers: this.obtenerHeaders(),
        responseType: 'blob'
      }
    ).pipe(timeout(30000)).subscribe({
      next: archivo => {
        const url = window.URL.createObjectURL(archivo);
        const enlace = document.createElement('a');
        const nombre = (factura.numeroFactura || `factura-${factura.id}`)
          .replace(/[^a-zA-Z0-9_-]/g, '_');

        enlace.href = url;
        enlace.download = `${nombre}.pdf`;
        document.body.appendChild(enlace);
        enlace.click();
        enlace.remove();
        window.setTimeout(() => window.URL.revokeObjectURL(url), 1000);

        this.descargandoPdf = false;
        this.mensajeExito = 'El PDF de la factura está listo.';
        this.cd.detectChanges();
      },
      error: error => {
        console.error('Error descargando PDF:', error);
        this.descargandoPdf = false;
        this.mensajeError = this.obtenerErrorBackend(error);
        this.cd.detectChanges();
      }
    });
  }

  // 16. ENVIAR FACTURA AL CORREO DEL PROPIETARIO

  enviarFacturaCorreo(): void {
    if (!this.facturaEmitida || this.enviandoCorreo) return;

    if (this.facturaEmitida.correoEnviado) {
      this.mensajeCorreo = 'Esta factura ya figura como enviada.';
      return;
    }

    if (!this.facturaEmitida.correoCliente) {
      this.mensajeError = 'El propietario no tiene un correo registrado en la factura.';
      return;
    }

    const factura = this.facturaEmitida;
    this.enviandoCorreo = true;
    this.mensajeError = '';
    this.mensajeCorreo = '';

    this.http.post<ResultadoEnvioFactura>(
      `${this.apiUrl}/facturas/${factura.id}/enviar-correo`,
      null,
      { headers: this.obtenerHeaders() }
    ).pipe(timeout(30000)).subscribe({
      next: resultado => {
        this.enviandoCorreo = false;

        // No marcar como enviado si el backend no lo confirma.
        this.facturaEmitida = {
          ...factura,
          correoEnviado: resultado.correoEnviado
        };

        this.mensajeCorreo = resultado.mensaje || (
          resultado.correoEnviado
            ? 'El servidor SMTP aceptó el envío del PDF.'
            : 'El backend no confirmó el envío del correo.'
        );
        this.cd.detectChanges();
      },
      error: error => {
        console.error('Error enviando factura por correo:', error);
        this.enviandoCorreo = false;
        this.mensajeError = this.obtenerErrorBackend(error);
        this.cd.detectChanges();
      }
    });
  }

  // 17. MENSAJES DE ERROR HTTP

  private obtenerErrorBackend(error: any): string {
    if (error?.status === 0) {
      return 'No se pudo conectar con Spring Boot. Revisa Tailscale y el puerto 8080.';
    }
    if (error?.status === 401) {
      return 'Tu sesión expiró. Inicia sesión nuevamente.';
    }
    if (error?.status === 403) {
      return 'No tienes permisos para realizar esta operación.';
    }
    if (error?.status === 404) {
      return 'No se encontró la información solicitada.';
    }
    if (error?.status === 409) {
      return this.extraerMensaje(error) || 'La operación entra en conflicto con el estado actual, un registro duplicado o el inventario.';
    }
    if (error?.status === 503) {
      return this.extraerMensaje(error) || 'El servicio de correo no está disponible.';
    }

    return this.extraerMensaje(error)
      || 'Ocurrió un error. Actualiza los datos y vuelve a intentarlo.';
  }

  private extraerMensaje(error: any): string {
    const datos = error?.error;
    if (typeof datos === 'string' && datos.trim()) return datos;

    if (datos && typeof datos === 'object') {
      const mensaje = datos.mensaje ?? datos.message ?? datos.detail ?? datos.error;
      if (typeof mensaje === 'string' && mensaje.trim()) return mensaje;
    }

    return '';
  }
}
