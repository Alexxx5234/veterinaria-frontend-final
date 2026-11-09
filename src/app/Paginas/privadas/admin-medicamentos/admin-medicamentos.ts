import { environment } from '../../../../environments/environment';

/* ==========================================================
   VETERINARIA ARÉVALO
   ADMINISTRACIÓN DE MEDICAMENTOS - ADMIN

   FUNCIONALIDADES:
   1. Consultar todos los medicamentos.
   2. Registrar medicamentos.
   3. Editar medicamentos.
   4. Administrar precios.
   5. Administrar existencias.
   6. Activar y desactivar medicamentos.
   7. Buscar medicamentos.
   8. Filtrar por estado.
   9. Ordenar por nombre, precio y stock.
   10. Mostrar estadísticas.
   11. Validar formularios.
   12. Notificaciones y manejo de errores.

   SEGURIDAD:
   - Utiliza el token JWT.
   - Las operaciones administrativas
     son autorizadas por Spring Security.

   CORRECCIÓN:
   - Registro de configuración regional es-EC.
   - Soluciona el error NG0701 de Angular.
========================================================== */


// ==========================================================
// 1. IMPORTACIONES
// ==========================================================

import {
  Component,
  OnInit,
  ChangeDetectorRef
} from '@angular/core';

import {
  CommonModule,
  registerLocaleData
} from '@angular/common';

// Datos regionales de Ecuador.
import localeEsEc from '@angular/common/locales/es-EC';

import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';

import {
  HttpClient,
  HttpHeaders
} from '@angular/common/http';

import { timeout } from 'rxjs/operators';

import { AuthServicio }
  from '../../../Servicios/auth-servicio';

import { NotificacionesServicio }
  from '../../../Servicios/notificaciones-servicio';


// ==========================================================
// 2. REGISTRAR CONFIGURACIÓN REGIONAL
// ==========================================================

// Permite que Angular utilice correctamente:
// - Símbolo monetario.
// - Separadores decimales.
// - Formato regional de Ecuador.
//
// Es necesario para el CurrencyPipe del HTML.

registerLocaleData(localeEsEc, 'es-EC');


// ==========================================================
// 3. MODELO DE MEDICAMENTO
// ==========================================================

interface MedicamentoAdmin {

  id: number;

  nombre: string;

  descripcion?: string | null;

  presentacion: string;

  concentracion?: string | null;

  unidadMedida: string;

  precioUnitario: number | string;

  stockDisponible: number | string;

  activo: boolean;

}


// ==========================================================
// 4. TIPOS DE FILTROS
// ==========================================================

type FiltroEstado =
  | 'TODOS'
  | 'ACTIVOS'
  | 'INACTIVOS';


// ==========================================================
// 5. COMPONENTE PRINCIPAL
// ==========================================================

@Component({

  selector: 'app-admin-medicamentos',

  standalone: true,

  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule
  ],

  templateUrl: './admin-medicamentos.html',

  styleUrl: './admin-medicamentos.scss'

})

export class AdminMedicamentos implements OnInit {


  // ========================================================
  // 6. CONFIGURACIÓN DEL BACKEND
  // ========================================================

  private readonly apiUrl =
    environment.apiUrl + '/medicamentos';

  // Tiempo máximo de espera de las peticiones.
  private readonly tiempoMaximo = 20000;


  // ========================================================
  // 7. LISTADO DE MEDICAMENTOS
  // ========================================================

  medicamentos: MedicamentoAdmin[] = [];


  // ========================================================
  // 8. ESTADOS DE LA INTERFAZ
  // ========================================================

  cargando = false;

  errorCarga = false;

  guardando = false;

  actualizandoEstadoId: number | null = null;

  mensajeError = '';

  mensajeExito = '';


  // ========================================================
  // 9. BUSCADOR Y FILTROS
  // ========================================================

  busqueda = '';

  filtroEstado: FiltroEstado = 'TODOS';

  ordenarPor = 'nombreAsc';


  // ========================================================
  // 10. FORMULARIO
  // ========================================================

  medicamentoForm: FormGroup;

  mostrarFormulario = false;

  // null significa registro nuevo.
  // Un número representa el medicamento que se edita.
  medicamentoEditandoId: number | null = null;


  // ========================================================
  // 11. CONSTRUCTOR
  // ========================================================

  constructor(

    private fb: FormBuilder,

    private http: HttpClient,

    private authServicio: AuthServicio,

    private notificacionesServicio: NotificacionesServicio,

    private cd: ChangeDetectorRef

  ) {

    // Crear formulario con los campos
    // correspondientes a Medicamento.java.

    this.medicamentoForm = this.fb.group({

      nombre: [
        '',
        [
          Validators.required,
          Validators.maxLength(150)
        ]
      ],

      descripcion: [
        '',
        Validators.maxLength(1000)
      ],

      presentacion: [
        '',
        [
          Validators.required,
          Validators.maxLength(100)
        ]
      ],

      concentracion: [
        '',
        Validators.maxLength(100)
      ],

      unidadMedida: [
        '',
        [
          Validators.required,
          Validators.maxLength(30)
        ]
      ],

      precioUnitario: [
        0,
        [
          Validators.required,
          Validators.min(0),
          Validators.max(9999999999.99)
        ]
      ],

      stockDisponible: [
        0,
        [
          Validators.required,
          Validators.min(0),
          Validators.max(9999999999.99)
        ]
      ]

    });

  }


  // ========================================================
  // 12. INICIALIZACIÓN
  // ========================================================

  ngOnInit(): void {

    // Consultar el catálogo al ingresar al módulo.
    this.cargarMedicamentos();

  }


  // ========================================================
  // 13. AUTENTICACIÓN JWT
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
  // 14. CONSULTAR MEDICAMENTOS
  // GET /api/medicamentos
  // ========================================================

  cargarMedicamentos(
    actualizacionManual: boolean = false
  ): void {

    // Evitar peticiones simultáneas.
    if (
      this.cargando ||
      this.guardando ||
      this.actualizandoEstadoId !== null
    ) {
      return;
    }

    this.cargando = true;

    this.errorCarga = false;

    this.mensajeError = '';

    this.http.get<MedicamentoAdmin[]>(

      this.apiUrl,

      {
        headers: this.obtenerHeaders()
      }

    ).pipe(

      timeout(this.tiempoMaximo)

    ).subscribe({

      next: respuesta => {

        // Evitar mostrar registros incompletos
        // que no tengan identificador o nombre.

        this.medicamentos = Array.isArray(respuesta)

          ? respuesta

              .filter(medicamento =>
                medicamento !== null &&
                medicamento.id !== null &&
                medicamento.id !== undefined &&
                Number(medicamento.id) > 0 &&
                String(medicamento.nombre ?? '').trim() !== ''
              )

              .sort((a, b) =>
                String(a.nombre).localeCompare(
                  String(b.nombre),
                  'es'
                )
              )

          : [];

        this.cargando = false;

        this.errorCarga = false;

        if (actualizacionManual) {

          this.mensajeExito =
            'El catálogo de medicamentos se actualizó correctamente.';

          this.notificacionesServicio.agregar(

            'Catálogo actualizado',

            'Se consultaron nuevamente los medicamentos registrados.',

            'info'

          );

        }

        this.cd.detectChanges();

      },

      error: error => {

        console.error(
          'Error al consultar medicamentos:',
          error
        );

        this.cargando = false;

        this.errorCarga = true;

        this.mensajeError =

          error?.status === 0

            ? 'No se pudo conectar con Spring Boot. Comprueba que el backend esté encendido.'

            : this.obtenerMensajeError(
                error,
                'No se pudieron cargar los medicamentos.'
              );

        this.notificacionesServicio.agregar(

          'Error al consultar medicamentos',

          this.mensajeError,

          'error'

        );

        this.cd.detectChanges();

      }

    });

  }


  // ========================================================
  // 15. OBTENER MENSAJES DEL BACKEND
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
      mensajePredeterminado
    );

  }


  // ========================================================
  // 16. ESTADÍSTICAS DEL INVENTARIO
  // ========================================================

  // Total de medicamentos registrados.

  get totalMedicamentos(): number {

    return this.medicamentos.length;

  }


  // Medicamentos habilitados.

  get totalActivos(): number {

    return this.medicamentos.filter(

      medicamento => medicamento.activo === true

    ).length;

  }


  // Medicamentos deshabilitados.

  get totalInactivos(): number {

    return this.medicamentos.filter(

      medicamento => medicamento.activo === false

    ).length;

  }


  // Medicamentos sin existencias.

  get totalSinStock(): number {

    return this.medicamentos.filter(

      medicamento =>
        this.numero(medicamento.stockDisponible) === 0

    ).length;

  }


  // ========================================================
  // 17. NORMALIZAR TEXTO
  // ========================================================

  private normalizarTexto(valor: unknown): string {

    return String(valor ?? '')

      .normalize('NFD')

      .replace(/[\u0300-\u036f]/g, '')

      .trim()

      .toLowerCase();

  }


  // ========================================================
  // 18. BUSCAR, FILTRAR Y ORDENAR
  // ========================================================

  get medicamentosFiltrados(): MedicamentoAdmin[] {

    const texto = this.normalizarTexto(this.busqueda);

    let resultado = this.medicamentos.filter(

      medicamento => {

        // Datos donde se realizará la búsqueda.
        const contenido = this.normalizarTexto([

          medicamento.id,

          medicamento.nombre,

          medicamento.descripcion,

          medicamento.presentacion,

          medicamento.concentracion,

          medicamento.unidadMedida

        ].join(' '));

        const coincideBusqueda =
          contenido.includes(texto);

        // Aplicar filtro de estado.
        const coincideEstado =

          this.filtroEstado === 'TODOS' ||

          (
            this.filtroEstado === 'ACTIVOS' &&
            medicamento.activo
          ) ||

          (
            this.filtroEstado === 'INACTIVOS' &&
            !medicamento.activo
          );

        return coincideBusqueda && coincideEstado;

      }

    );

    // Ordenar los resultados.
    resultado = [...resultado].sort((a, b) => {

      if (this.ordenarPor === 'precioAsc') {

        return this.numero(a.precioUnitario) -
          this.numero(b.precioUnitario);

      }

      if (this.ordenarPor === 'precioDesc') {

        return this.numero(b.precioUnitario) -
          this.numero(a.precioUnitario);

      }

      if (this.ordenarPor === 'stockAsc') {

        return this.numero(a.stockDisponible) -
          this.numero(b.stockDisponible);

      }

      if (this.ordenarPor === 'stockDesc') {

        return this.numero(b.stockDisponible) -
          this.numero(a.stockDisponible);

      }

      const comparacion =
        String(a.nombre).localeCompare(
          String(b.nombre),
          'es',
          {
            sensitivity: 'base'
          }
        );

      return this.ordenarPor === 'nombreDesc'
        ? -comparacion
        : comparacion;

    });

    return resultado;

  }


  // ========================================================
  // 19. LIMPIAR FILTROS
  // ========================================================

  limpiarFiltros(): void {

    this.busqueda = '';

    this.filtroEstado = 'TODOS';

    this.ordenarPor = 'nombreAsc';

  }


  // ========================================================
  // 20. CONVERTIR VALORES A NÚMERO
  // ========================================================

  numero(
    valor: number | string | null | undefined
  ): number {

    const resultado = Number(valor);

    return Number.isFinite(resultado)
      ? resultado
      : 0;

  }


  // ========================================================
  // 21. VALIDAR CAMPOS DEL FORMULARIO
  // ========================================================

  campoInvalido(nombre: string): boolean {

    const control = this.medicamentoForm.get(nombre);

    return !!control &&

      control.invalid &&

      (
        control.touched ||
        control.dirty
      );

  }


  // ========================================================
  // 22. COMPROBAR OPERACIONES EN CURSO
  // ========================================================

  get hayOperacionEnCurso(): boolean {

    return this.guardando ||

      this.actualizandoEstadoId !== null;

  }


  // ========================================================
  // 23. ABRIR FORMULARIO PARA NUEVO MEDICAMENTO
  // ========================================================

  nuevoMedicamento(): void {

    if (this.hayOperacionEnCurso) {
      return;
    }

    this.medicamentoEditandoId = null;

    this.medicamentoForm.reset({

      nombre: '',

      descripcion: '',

      presentacion: '',

      concentracion: '',

      unidadMedida: '',

      precioUnitario: 0,

      stockDisponible: 0

    });

    this.mensajeError = '';

    this.mensajeExito = '';

    this.mostrarFormulario = true;

  }


  // ========================================================
  // 24. EDITAR MEDICAMENTO
  // ========================================================

  editarMedicamento(
    medicamento: MedicamentoAdmin
  ): void {

    if (this.hayOperacionEnCurso) {
      return;
    }

    this.medicamentoEditandoId = medicamento.id;

    this.medicamentoForm.reset({

      nombre: medicamento.nombre,

      descripcion: medicamento.descripcion ?? '',

      presentacion: medicamento.presentacion,

      concentracion: medicamento.concentracion ?? '',

      unidadMedida: medicamento.unidadMedida,

      precioUnitario: this.numero(
        medicamento.precioUnitario
      ),

      stockDisponible: this.numero(
        medicamento.stockDisponible
      )

    });

    this.mensajeError = '';

    this.mensajeExito = '';

    this.mostrarFormulario = true;

  }


  // ========================================================
  // 25. VALIDAR DECIMALES
  // ========================================================

  private decimalValido(valor: unknown): boolean {

    const texto = String(valor ?? '')

      .trim()

      .replace(',', '.');

    return /^\d{1,10}(?:\.\d{1,2})?$/.test(texto);

  }


  // ========================================================
  // 26. GUARDAR MEDICAMENTO
  //
  // NUEVO:
  // POST /api/medicamentos
  //
  // EDICIÓN:
  // PUT /api/medicamentos/{id}
  // ========================================================

  guardarMedicamento(): void {

    if (this.hayOperacionEnCurso || this.cargando) {
      return;
    }

    this.mensajeError = '';

    this.mensajeExito = '';

    // Marcar todos los campos para mostrar errores.
    this.medicamentoForm.markAllAsTouched();

    if (this.medicamentoForm.invalid) {

      this.mensajeError =
        'Completa correctamente todos los campos obligatorios.';

      return;

    }

    const valores = this.medicamentoForm.getRawValue();

    // Validar formato decimal.
    if (
      !this.decimalValido(valores.precioUnitario) ||
      !this.decimalValido(valores.stockDisponible)
    ) {

      this.mensajeError =
        'El precio y el stock admiten máximo dos decimales y no pueden ser negativos.';

      return;

    }

    // Validar campos obligatorios.
    const nombre =
      String(valores.nombre ?? '').trim();

    const presentacion =
      String(valores.presentacion ?? '').trim();

    const unidadMedida =
      String(valores.unidadMedida ?? '').trim();

    if (!nombre || !presentacion || !unidadMedida) {

      this.mensajeError =
        'Nombre, presentación y unidad de medida son obligatorios.';

      return;

    }

    // Normalizar números.
    const precio = Number(
      String(valores.precioUnitario).trim().replace(',', '.')
    );

    const stock = Number(
      String(valores.stockDisponible).trim().replace(',', '.')
    );

    if (
      !Number.isFinite(precio) ||
      !Number.isFinite(stock) ||
      precio < 0 ||
      stock < 0
    ) {

      this.mensajeError =
        'El precio y el stock deben ser valores numéricos no negativos.';

      return;

    }

    // Preparar el objeto para Spring Boot.
    const datos = {

      nombre,

      descripcion:
        String(valores.descripcion ?? '').trim() || null,

      presentacion,

      concentracion:
        String(valores.concentracion ?? '').trim() || null,

      unidadMedida: unidadMedida.toUpperCase(),

      precioUnitario: precio,

      stockDisponible: stock

    };

    const editando =
      this.medicamentoEditandoId !== null;

    this.guardando = true;

    // Determinar si se crea o actualiza.
    const peticion = editando

      ? this.http.put(

          `${this.apiUrl}/${this.medicamentoEditandoId}`,

          datos,

          {
            headers: this.obtenerHeaders()
          }

        )

      : this.http.post(

          this.apiUrl,

          datos,

          {
            headers: this.obtenerHeaders()
          }

        );

    peticion.pipe(

      timeout(this.tiempoMaximo)

    ).subscribe({

      next: () => {

        this.guardando = false;

        this.cerrarFormulario();

        this.mensajeExito = editando

          ? 'Medicamento actualizado correctamente.'

          : 'Medicamento registrado correctamente.';

        this.notificacionesServicio.agregar(

          editando
            ? 'Medicamento actualizado'
            : 'Medicamento registrado',

          this.mensajeExito,

          'exito'

        );

        // Actualizar la tabla con los datos del backend.
        this.cargarMedicamentos();

        this.cd.detectChanges();

      },

      error: error => {

        console.error(
          'Error al guardar medicamento:',
          error
        );

        this.guardando = false;

        this.mensajeError =

          error?.status === 0

            ? 'No se pudo conectar con Spring Boot.'

            : this.obtenerMensajeError(
                error,
                'No se pudo guardar el medicamento.'
              );

        this.notificacionesServicio.agregar(

          'Error al guardar medicamento',

          this.mensajeError,

          'error'

        );

        this.cd.detectChanges();

      }

    });

  }


  // ========================================================
  // 27. ACTIVAR O DESACTIVAR MEDICAMENTO
  //
  // ACTIVAR:
  // PUT /api/medicamentos/{id}/activar
  //
  // DESACTIVAR:
  // PUT /api/medicamentos/{id}/desactivar
  // ========================================================

  cambiarEstado(
    medicamento: MedicamentoAdmin
  ): void {

    if (this.hayOperacionEnCurso || this.cargando) {
      return;
    }

    const activar = !medicamento.activo;

    const accion = activar
      ? 'activar'
      : 'desactivar';

    // Confirmación antes de cambiar el estado.
    const confirmado = window.confirm(

      `¿Estás seguro de ${accion} el medicamento "${medicamento.nombre}"?`

    );

    if (!confirmado) {
      return;
    }

    this.actualizandoEstadoId = medicamento.id;

    this.mensajeError = '';

    this.mensajeExito = '';

    const endpoint = activar
      ? 'activar'
      : 'desactivar';

    this.http.put(

      `${this.apiUrl}/${medicamento.id}/${endpoint}`,

      {},

      {
        headers: this.obtenerHeaders()
      }

    ).pipe(

      timeout(this.tiempoMaximo)

    ).subscribe({

      next: () => {

        this.actualizandoEstadoId = null;

        this.mensajeExito = activar

          ? 'Medicamento activado correctamente.'

          : 'Medicamento desactivado correctamente.';

        this.notificacionesServicio.agregar(

          activar
            ? 'Medicamento activado'
            : 'Medicamento desactivado',

          `${medicamento.nombre}: ${this.mensajeExito}`,

          'exito'

        );

        // Actualizar inventario desde Spring Boot.
        this.cargarMedicamentos();

        this.cd.detectChanges();

      },

      error: error => {

        console.error(
          'Error al cambiar estado:',
          error
        );

        this.actualizandoEstadoId = null;

        this.mensajeError =

          error?.status === 0

            ? 'No se pudo conectar con Spring Boot.'

            : this.obtenerMensajeError(
                error,
                'No se pudo modificar el estado del medicamento.'
              );

        this.notificacionesServicio.agregar(

          'Error al cambiar estado',

          this.mensajeError,

          'error'

        );

        this.cd.detectChanges();

      }

    });

  }


  // ========================================================
  // 28. CERRAR FORMULARIO
  // ========================================================

  cerrarFormulario(): void {

    if (this.guardando) {
      return;
    }

    this.mostrarFormulario = false;

    this.medicamentoEditandoId = null;

    this.medicamentoForm.reset({

      nombre: '',

      descripcion: '',

      presentacion: '',

      concentracion: '',

      unidadMedida: '',

      precioUnitario: 0,

      stockDisponible: 0

    });

  }


  // ========================================================
  // 29. IDENTIFICAR MEDICAMENTOS EN ANGULAR
  // ========================================================

  identificarMedicamento(
    _index: number,
    medicamento: MedicamentoAdmin
  ): number {

    return medicamento.id;

  }

}
