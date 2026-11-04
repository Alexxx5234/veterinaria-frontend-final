
/* ==========================================================
   VETERINARIA AREVALO
   ADMINISTRACIÓN DE CITAS (ADMIN)

   FUNCIONALIDADES:
   - Consultar todas las citas de Spring Boot.
   - Consultar mascotas, veterinarios y servicios.
   - Mostrar estadísticas por estado.
   - Buscar y filtrar citas.
   - Ordenar por fecha.
   - Registrar nuevas citas.
   - Editar citas existentes.
   - Cancelar citas sin eliminarlas.
   - Eliminar citas con confirmación.
   - Validar formularios.
   - Enviar notificaciones al menú global.

   IMPORTANTE:
   Se mantienen los endpoints de CitaServicio.
   ========================================================== */


// ==========================================================
// IMPORTACIONES ANGULAR
// ==========================================================

import {
  Component,
  OnInit,
  ChangeDetectorRef,
  ViewChild,
  ElementRef
} from '@angular/core';

// Directivas y formato de fechas y valores.
import { CommonModule } from '@angular/common';

// Formularios reactivos y filtros con ngModel.
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';

// Navegación entre páginas.
import { Router } from '@angular/router';

// Consultar varias peticiones al mismo tiempo.
import {
  forkJoin,
  Observable
} from 'rxjs';


// ==========================================================
// SERVICIOS DE LA API
// ==========================================================

import { CitaServicio }
  from '../../../Servicios/cita-servicio';

import { MascotaServicio }
  from '../../../Servicios/mascota-servicio';

import { VeterinarioServicio }
  from '../../../Servicios/veterinario-servicio';

import { ServicioServicio }
  from '../../../Servicios/servicio-servicio';

// Notificaciones globales.
import { NotificacionesServicio }
  from '../../../Servicios/notificaciones-servicio';


// ==========================================================
// INTERFACES
// ==========================================================

// Propietario de una mascota.
interface PropietarioCita {
  id?: number;
  nombre?: string;
  apellido?: string;
  correo?: string;
}

// Mascota asociada a una cita.
interface MascotaCita {
  id: number;
  nombre?: string;
  especie?: string;
  raza?: string;
  usuario?: PropietarioCita | null;
}

// Veterinario asociado a una cita.
interface VeterinarioCita {
  id: number;
  nombre?: string;
  apellido?: string;
  especialidad?: string;
}

// Servicio veterinario.
interface ServicioCita {
  id: number;
  nombre?: string;
  precio?: number | string | null;
}

// Información recibida desde la API.
interface CitaAdmin {
  id: number;
  fechaHora: string;
  motivo?: string | null;
  estado: string;
  mascota?: MascotaCita | null;
  veterinario?: VeterinarioCita | null;
  servicio?: ServicioCita | null;
}


// ==========================================================
// COMPONENTE ADMIN CITAS
// ==========================================================

@Component({

  selector: 'app-admin-citas',

  standalone: true,

  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule
  ],

  templateUrl: './admin-citas.html',

  styleUrl: './admin-citas.scss'

})
export class AdminCitas implements OnInit {


  // ========================================================
  // LISTAS DEL SISTEMA
  // ========================================================

  citas: CitaAdmin[] = [];

  mascotas: MascotaCita[] = [];

  veterinarios: VeterinarioCita[] = [];

  servicios: ServicioCita[] = [];


  // ========================================================
  // ESTADOS DE LA PÁGINA
  // ========================================================

  cargando: boolean = false;

  errorCarga: boolean = false;

  guardando: boolean = false;

  // Identifica una cita que se está cancelando
  // o eliminando.
  procesandoId: number | null = null;

  mensajeError: string = '';

  mensajeExito: string = '';


  // ========================================================
  // BÚSQUEDA Y FILTROS
  // ========================================================

  // Permite buscar citas por diferentes datos.
  busqueda: string = '';

  // Por defecto se muestran todas.
  filtroEstado: string = 'TODOS';

  // Las más recientes aparecen primero.
  ordenarPor: string = 'fechaDesc';


  // ========================================================
  // FORMULARIO
  // ========================================================

  mostrarFormulario: boolean = false;

  // null: nueva cita.
  // número: editar una cita existente.
  citaEditandoId: number | null = null;

  citaForm: FormGroup;

  // Enfocar la fecha al abrir el formulario.
  @ViewChild('campoFecha')
  campoFecha?: ElementRef<HTMLInputElement>;


  // ========================================================
  // CONSTRUCTOR
  // ========================================================

  constructor(

    private citaServicio: CitaServicio,

    private mascotaServicio: MascotaServicio,

    private veterinarioServicio: VeterinarioServicio,

    private servicioServicio: ServicioServicio,

    private notificacionesServicio: NotificacionesServicio,

    private fb: FormBuilder,

    private router: Router,

    private cd: ChangeDetectorRef

  ) {

    // Los campos conservan los nombres originales.
    this.citaForm = this.fb.group({

      fechaHora: [
        '',
        Validators.required
      ],

      motivo: [
        '',
        Validators.required
      ],

      mascotaId: [
        '',
        Validators.required
      ],

      veterinarioId: [
        '',
        Validators.required
      ],

      servicioId: [
        '',
        Validators.required
      ],

      estado: [
        'PENDIENTE',
        Validators.required
      ]

    });

  }


  // ========================================================
  // INICIAR LA PÁGINA
  // ========================================================

  ngOnInit(): void {

    this.cargarDatos();

  }


  // ========================================================
  // NORMALIZAR TEXTO
  // ========================================================

  /*
    Permite buscar sin importar:
    - Mayúsculas o minúsculas.
    - Tildes.

    Ejemplo:
    "vacunacion" encuentra "Vacunación".
  */

  private normalizarTexto(valor: unknown): string {

    return String(valor ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();

  }


  // ========================================================
  // CARGAR DATOS DESDE SPRING BOOT
  // ========================================================

  cargarDatos(
    actualizacionManual: boolean = false
  ): void {

    // Impedir peticiones simultáneas.
    if (
      this.cargando ||
      this.guardando ||
      this.procesandoId !== null
    ) {
      return;
    }

    this.cargando = true;

    this.errorCarga = false;

    this.mensajeError = '';


    // ======================================================
    // CONSULTAS REST EXISTENTES
    // ======================================================

    /*
      forkJoin consulta simultáneamente:

      GET /api/citas
      GET /api/mascotas
      GET /api/veterinarios
      GET /api/servicios

      El interceptor agrega automáticamente el JWT
      de la sesión ADMIN.
    */

    forkJoin({

      citas:
        this.citaServicio.listarTodasCitas(),

      mascotas:
        this.mascotaServicio.listarTodasMascotas(),

      veterinarios:
        this.veterinarioServicio.listarVeterinarios(),

      servicios:
        this.servicioServicio.listarServicios()

    }).subscribe({


      // ====================================================
      // RESPUESTA CORRECTA
      // ====================================================

      next: (respuesta) => {

        // Guardar únicamente arreglos.
        this.citas = Array.isArray(respuesta.citas)
          ? respuesta.citas
          : [];

        this.mascotas = Array.isArray(respuesta.mascotas)
          ? respuesta.mascotas
          : [];

        this.veterinarios =
          Array.isArray(respuesta.veterinarios)
            ? respuesta.veterinarios
            : [];

        this.servicios = Array.isArray(respuesta.servicios)
          ? respuesta.servicios
          : [];

        this.cargando = false;

        this.errorCarga = false;


        // Confirmar una actualización manual.
        if (actualizacionManual) {

          this.mensajeExito =
            'El listado de citas se actualizó correctamente.';

          this.notificacionesServicio.agregar(
            'Citas actualizadas',
            'Se consultó nuevamente el listado de citas.',
            'info'
          );

        }

        this.cd.detectChanges();

      },


      // ====================================================
      // ERROR DE CONSULTA
      // ====================================================

      error: (error) => {

        console.error(
          'Error al cargar administración de citas:',
          error
        );

        this.cargando = false;

        this.errorCarga = true;

        this.mensajeError =
          error?.status === 0
            ? 'No se pudo conectar con Spring Boot. Verifica que la API esté encendida.'
            : 'No se pudieron cargar los datos de las citas. Intenta nuevamente.';

        this.notificacionesServicio.agregar(
          'Error al consultar citas',
          'No fue posible cargar la información de las citas.',
          'error'
        );

        this.cd.detectChanges();

      }

    });

  }


  // ========================================================
  // ESTADÍSTICAS
  // ========================================================

  get totalCitas(): number {

    return this.citas.length;

  }

  get totalPendientes(): number {

    return this.citas.filter(
      cita => cita.estado === 'PENDIENTE'
    ).length;

  }

  get totalConfirmadas(): number {

    return this.citas.filter(
      cita => cita.estado === 'CONFIRMADA'
    ).length;

  }

  get totalCompletadas(): number {

    return this.citas.filter(
      cita => cita.estado === 'COMPLETADA'
    ).length;

  }

  get totalCanceladas(): number {

    return this.citas.filter(
      cita => cita.estado === 'CANCELADA'
    ).length;

  }


  // ========================================================
  // FILTRAR Y ORDENAR CITAS
  // ========================================================

  get citasFiltradas(): CitaAdmin[] {

    const textoBuscado =
      this.normalizarTexto(this.busqueda);

    // ======================================================
    // BÚSQUEDA Y ESTADO
    // ======================================================

    const resultado = this.citas.filter(cita => {

      // Buscar en todos los datos relevantes.
      const contenido = this.normalizarTexto([

        cita.id,
        cita.motivo,
        cita.estado,

        cita.mascota?.nombre,
        cita.mascota?.especie,

        cita.mascota?.usuario?.nombre,
        cita.mascota?.usuario?.apellido,
        cita.mascota?.usuario?.correo,

        cita.veterinario?.nombre,
        cita.veterinario?.apellido,

        cita.servicio?.nombre

      ].join(' '));

      const coincideBusqueda =
        contenido.includes(textoBuscado);

      const coincideEstado =
        this.filtroEstado === 'TODOS' ||
        cita.estado === this.filtroEstado;

      return coincideBusqueda && coincideEstado;

    });


    // ======================================================
    // ORDENAMIENTO
    // ======================================================

    return [...resultado].sort((a, b) => {

      // Los valores ISO de fecha y hora de Spring Boot
      // permiten ordenar cronológicamente.
      const fechaA = String(a.fechaHora ?? '');
      const fechaB = String(b.fechaHora ?? '');

      const comparacion =
        fechaA.localeCompare(fechaB);

      if (this.ordenarPor === 'fechaAsc') {
        return comparacion;
      }

      if (this.ordenarPor === 'idDesc') {
        return b.id - a.id;
      }

      // Predeterminado: fecha más reciente primero.
      return -comparacion;

    });

  }


  // ========================================================
  // LIMPIAR FILTROS
  // ========================================================

  limpiarFiltros(): void {

    this.busqueda = '';

    this.filtroEstado = 'TODOS';

    this.ordenarPor = 'fechaDesc';

  }


  // ========================================================
  // VALIDACIÓN VISUAL DE CAMPOS
  // ========================================================

  campoInvalido(nombreCampo: string): boolean {

    const control = this.citaForm.get(nombreCampo);

    return !!control &&
      control.invalid &&
      (control.touched || control.dirty);

  }


  // ========================================================
  // COMPROBAR OPERACIONES ACTIVAS
  // ========================================================

  get hayOperacionEnCurso(): boolean {

    return (
      this.guardando ||
      this.procesandoId !== null
    );

  }


  // ========================================================
  // NUEVA CITA
  // ========================================================

  nuevaCita(): void {

    if (this.cargando || this.hayOperacionEnCurso) {
      return;
    }

    // No existe ID porque se creará una cita nueva.
    this.citaEditandoId = null;

    // Limpiar formulario.
    this.citaForm.reset({

      fechaHora: '',

      motivo: '',

      mascotaId: '',

      veterinarioId: '',

      servicioId: '',

      estado: 'PENDIENTE'

    });

    this.mensajeError = '';

    this.mensajeExito = '';

    this.mostrarFormulario = true;

    this.cd.detectChanges();

    this.campoFecha?.nativeElement.focus();

  }


  // ========================================================
  // EDITAR CITA
  // ========================================================

  editarCita(cita: CitaAdmin): void {

    if (this.cargando || this.hayOperacionEnCurso) {
      return;
    }

    // Guardamos el ID para ejecutar el PUT.
    this.citaEditandoId = cita.id;

    // Cargamos los valores actuales.
    this.citaForm.reset({

      fechaHora:
        this.formatearFechaParaInput(cita.fechaHora),

      motivo:
        cita.motivo ?? '',

      mascotaId:
        cita.mascota?.id ?? '',

      veterinarioId:
        cita.veterinario?.id ?? '',

      servicioId:
        cita.servicio?.id ?? '',

      estado:
        cita.estado ?? 'PENDIENTE'

    });

    this.mensajeError = '';

    this.mensajeExito = '';

    this.mostrarFormulario = true;

    this.cd.detectChanges();

    this.campoFecha?.nativeElement.focus();

  }


  // ========================================================
  // GUARDAR CITA
  // ========================================================

  /*
    Este método conserva el funcionamiento original:

    Crear:
    POST /api/citas

    Editar:
    PUT /api/citas/{id}
  */

  guardarCita(): void {

    if (this.cargando || this.hayOperacionEnCurso) {
      return;
    }

    this.mensajeError = '';


    // ======================================================
    // VALIDAR FORMULARIO
    // ======================================================

    if (this.citaForm.invalid) {

      this.citaForm.markAllAsTouched();

      return;

    }

    const valores = this.citaForm.getRawValue();

    // No aceptar motivos que contengan solo espacios.
    const motivo = String(
      valores.motivo ?? ''
    ).trim();

    if (!motivo) {

      this.citaForm.get('motivo')?.setErrors({
        required: true
      });

      this.citaForm.get('motivo')?.markAsTouched();

      return;

    }


    // ======================================================
    // JSON PARA SPRING BOOT
    // ======================================================

    /*
      Mantenemos las relaciones por ID:

      mascota: { id }
      veterinario: { id }
      servicio: { id }

      El estado sigue siendo editable por ADMIN.
    */

    const datosCita = {

      fechaHora:
        valores.fechaHora,

      motivo,

      estado:
        valores.estado,

      mascota: {
        id: Number(valores.mascotaId)
      },

      veterinario: {
        id: Number(valores.veterinarioId)
      },

      servicio: {
        id: Number(valores.servicioId)
      }

    };


    // ======================================================
    // CREAR O ACTUALIZAR
    // ======================================================

    const editando =
      this.citaEditandoId !== null;

    const peticion: Observable<any> = editando

      ? this.citaServicio.actualizarCita(
          this.citaEditandoId!,
          datosCita
        )

      : this.citaServicio.crearCita(
          datosCita
        );


    this.guardando = true;

    this.mensajeExito = '';


    peticion.subscribe({


      // ====================================================
      // RESPUESTA CORRECTA
      // ====================================================

      next: () => {

        this.guardando = false;

        // Cerramos el formulario.
        this.cerrarFormulario();

        // Mensaje local de confirmación.
        this.mensajeExito = editando
          ? 'Cita actualizada correctamente.'
          : 'Cita creada correctamente.';

        // Mensaje global en la campana.
        this.notificacionesServicio.agregar(

          editando
            ? 'Cita actualizada'
            : 'Nueva cita registrada',

          this.mensajeExito,

          'exito'

        );

        // Consultar nuevamente la API.
        this.cargarDatos();

        this.cd.detectChanges();

      },


      // ====================================================
      // ERROR AL GUARDAR
      // ====================================================

      error: (error) => {

        console.error(
          'Error al guardar cita:',
          error
        );

        this.guardando = false;

        this.mensajeError =
          error?.error?.mensaje ||
          error?.error?.message ||
          error?.error?.detail ||
          'No se pudo guardar la cita. Revisa los datos ingresados.';

        this.notificacionesServicio.agregar(
          'Error al guardar cita',
          'No se pudo completar el registro o la actualización.',
          'error'
        );

        this.cd.detectChanges();

      }

    });

  }


  // ========================================================
  // CANCELAR CITA
  // ========================================================

  /*
    CANCELAR no elimina la cita.

    PUT /api/citas/{id}/cancelar

    El backend actualiza el estado a CANCELADA.
  */

  cancelarCita(cita: CitaAdmin): void {

    if (
      this.cargando ||
      this.hayOperacionEnCurso ||
      cita.estado === 'CANCELADA'
    ) {
      return;
    }

    const confirmar = window.confirm(
      `¿Deseas cancelar la cita #${cita.id}? La cita seguirá registrada con estado CANCELADA.`
    );

    if (!confirmar) {
      return;
    }

    this.procesandoId = cita.id;

    this.mensajeError = '';
    this.mensajeExito = '';

    this.citaServicio
      .cancelarCita(cita.id)
      .subscribe({

        next: () => {

          this.procesandoId = null;

          this.mensajeExito =
            'Cita cancelada correctamente.';

          this.notificacionesServicio.agregar(
            'Cita cancelada',
            `La cita #${cita.id} fue cancelada.`,
            'exito'
          );

          this.cargarDatos();

        },

        error: (error) => {

          console.error(
            'Error al cancelar cita:',
            error
          );

          this.procesandoId = null;

          this.mensajeError =
            error?.error?.mensaje ||
            error?.error?.message ||
            'No se pudo cancelar la cita.';

          this.notificacionesServicio.agregar(
            'Error al cancelar cita',
            `No se pudo cancelar la cita #${cita.id}.`,
            'error'
          );

          this.cd.detectChanges();

        }

      });

  }


  // ========================================================
  // ELIMINAR CITA
  // ========================================================

  /*
    DELETE /api/citas/{id}

    A diferencia de cancelar, esta operación
    elimina definitivamente el registro.
  */

  eliminarCita(cita: CitaAdmin): void {

    if (this.cargando || this.hayOperacionEnCurso) {
      return;
    }

    const confirmar = window.confirm(
      `¿Eliminar definitivamente la cita #${cita.id}? Esta acción no se puede deshacer.`
    );

    if (!confirmar) {
      return;
    }

    this.procesandoId = cita.id;

    this.mensajeError = '';
    this.mensajeExito = '';

    this.citaServicio
      .eliminarCita(cita.id)
      .subscribe({

        next: () => {

          this.procesandoId = null;

          // Si el formulario corresponde a esta cita,
          // lo cerramos para evitar editarla.
          if (this.citaEditandoId === cita.id) {
            this.cerrarFormulario();
          }

          this.mensajeExito =
            'Cita eliminada correctamente.';

          this.notificacionesServicio.agregar(
            'Cita eliminada',
            `La cita #${cita.id} fue eliminada.`,
            'exito'
          );

          this.cargarDatos();

        },

        error: (error) => {

          console.error(
            'Error al eliminar cita:',
            error
          );

          this.procesandoId = null;

          this.mensajeError =
            error?.error?.mensaje ||
            error?.error?.message ||
            'No se pudo eliminar la cita.';

          this.notificacionesServicio.agregar(
            'Error al eliminar cita',
            `No se pudo eliminar la cita #${cita.id}.`,
            'error'
          );

          this.cd.detectChanges();

        }

      });

  }


  // ========================================================
  // FORMATEAR FECHA PARA datetime-local
  // ========================================================

  /*
    Se mantiene la lógica de tu código original.

    El backend puede devolver:
    2026-10-25T18:45:00

    El input necesita:
    2026-10-25T18:45
  */

  formatearFechaParaInput(
    fechaHora: string
  ): string {

    if (!fechaHora) {
      return '';
    }

    return String(fechaHora).substring(0, 16);

  }


  // ========================================================
  // CERRAR FORMULARIO
  // ========================================================

  cerrarFormulario(): void {

    if (this.guardando) {
      return;
    }

    this.mostrarFormulario = false;

    this.citaEditandoId = null;

    this.citaForm.reset();

    this.cd.detectChanges();

  }


  // ========================================================
  // IDENTIFICADOR DE CITAS PARA ANGULAR
  // ========================================================

  trackByCita(
    index: number,
    cita: CitaAdmin
  ): number {

    return cita.id ?? index;

  }


  // ========================================================
  // VOLVER AL DASHBOARD ADMIN
  // ========================================================

  volverDashboard(): void {

    void this.router.navigate([
      '/admin/dashboard'
    ]);

  }

}
