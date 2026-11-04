
/* ==========================================================
   VETERINARIA AREVALO - MIS CITAS (USER)

   FUNCIONALIDADES:
   - Consultar las citas del usuario autenticado.
   - Registrar nuevas citas.
   - Editar citas existentes.
   - Cancelar citas con confirmación.
   - Buscar y filtrar citas.
   - Mostrar estados de carga, éxito y error.
   - Enviar avisos a las notificaciones globales.

   Se conservan los endpoints del CitaServicio.
   ========================================================== */


// ==========================================================
// IMPORTACIONES DE ANGULAR
// ==========================================================

import {
  Component,
  OnInit,
  ChangeDetectorRef,
  ViewChild,
  ElementRef
} from '@angular/core';

import { CommonModule } from '@angular/common';

import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';

import { Router } from '@angular/router';

import { forkJoin } from 'rxjs';


// ==========================================================
// SERVICIOS DE LA API REST
// ==========================================================

import { CitaServicio }
  from '../../../Servicios/cita-servicio';

import { MascotaServicio }
  from '../../../Servicios/mascota-servicio';

import { ServicioServicio }
  from '../../../Servicios/servicio-servicio';

import { VeterinarioServicio }
  from '../../../Servicios/veterinario-servicio';


// ==========================================================
// NOTIFICACIONES COMPARTIDAS
// ==========================================================

// Este servicio se creó con el menú lateral permanente.
// Los avisos aparecerán en la campana del layout.
import { NotificacionesServicio }
  from '../../../Servicios/notificaciones-servicio';


// ==========================================================
// COMPONENTE
// ==========================================================

@Component({

  selector: 'app-citas',

  standalone: true,

  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule
  ],

  templateUrl: './citas.html',

  styleUrl: './citas.scss'

})
export class Citas implements OnInit {


  // ========================================================
  // INFORMACIÓN RECIBIDA DE SPRING BOOT
  // ========================================================

  citas: any[] = [];

  mascotas: any[] = [];

  servicios: any[] = [];

  veterinarios: any[] = [];


  // ========================================================
  // ESTADOS DE LA PÁGINA
  // ========================================================

  // Consulta de información.
  cargando: boolean = false;

  // Creación o edición de una cita.
  guardando: boolean = false;

  // ID de la cita que se está cancelando.
  cancelandoId: number | null = null;

  // Indica que falló la consulta inicial.
  errorCarga: boolean = false;

  mensajeError: string = '';

  mensajeExito: string = '';


  // ========================================================
  // FILTROS DE BÚSQUEDA
  // ========================================================

  busqueda: string = '';

  filtroEstado: string = 'TODOS';


  // ========================================================
  // FORMULARIO
  // ========================================================

  citaForm: FormGroup;

  mostrarFormulario: boolean = false;

  // null: registrar.
  // número: editar.
  citaEditandoId: number | null = null;

  // Fecha mínima sugerida al registrar.
  fechaMinima: string = '';

  // Campo que recibe el foco al abrir el formulario.
  @ViewChild('selectorMascota')
  selectorMascota?: ElementRef<HTMLSelectElement>;


  // ========================================================
  // CONSTRUCTOR
  // ========================================================

  constructor(

    private citaServicio: CitaServicio,

    private mascotaServicio: MascotaServicio,

    private servicioServicio: ServicioServicio,

    private veterinarioServicio: VeterinarioServicio,

    private notificacionesServicio: NotificacionesServicio,

    private fb: FormBuilder,

    private router: Router,

    private cd: ChangeDetectorRef

  ) {


    // ======================================================
    // CREACIÓN DEL FORMULARIO REACTIVO
    // ======================================================

    this.citaForm = this.fb.group({

      mascotaId: [
        '',
        Validators.required
      ],

      servicioId: [
        '',
        Validators.required
      ],

      veterinarioId: [
        '',
        Validators.required
      ],

      fechaHora: [
        '',
        Validators.required
      ],

      motivo: [
        '',
        Validators.required
      ]

    });

  }


  // ========================================================
  // INICIAR PÁGINA
  // ========================================================

  ngOnInit(): void {

    this.actualizarFechaMinima();

    this.cargarDatos();

  }


  // ========================================================
  // CONSULTAR INFORMACIÓN DESDE SPRING BOOT
  // ========================================================

  cargarDatos(): void {

    // Evita consultas duplicadas mientras carga.
    if (this.cargando) {
      return;
    }

    this.cargando = true;

    this.errorCarga = false;

    this.mensajeError = '';


    // forkJoin obtiene las cuatro listas
    // mediante los servicios originales.
    forkJoin({

      citas:
        this.citaServicio.listarMisCitas(),

      mascotas:
        this.mascotaServicio.listarMisMascotas(),

      servicios:
        this.servicioServicio.listarServicios(),

      veterinarios:
        this.veterinarioServicio.listarVeterinarios()

    }).subscribe({


      // ====================================================
      // CONSULTA CORRECTA
      // ====================================================

      next: (respuesta) => {

        // Verificamos que la API entregue listas.
        this.citas = Array.isArray(respuesta.citas)
          ? respuesta.citas
          : [];

        this.mascotas = Array.isArray(respuesta.mascotas)
          ? respuesta.mascotas
          : [];

        this.servicios = Array.isArray(respuesta.servicios)
          ? respuesta.servicios
          : [];

        this.veterinarios = Array.isArray(respuesta.veterinarios)
          ? respuesta.veterinarios
          : [];

        this.cargando = false;

        this.errorCarga = false;

        this.cd.detectChanges();

      },


      // ====================================================
      // ERROR DE CONSULTA
      // ====================================================

      error: (error) => {

        console.error(
          'Error al consultar Mis Citas:',
          error
        );

        this.cargando = false;

        this.errorCarga = true;

        this.mensajeError =
          'No se pudo cargar la información de las citas. Intenta nuevamente.';

        // Aviso en la campana global.
        this.notificacionesServicio.agregar(
          'Error al consultar citas',
          'No fue posible obtener la información desde el servidor.',
          'error'
        );

        this.cd.detectChanges();

      }

    });

  }


  // ========================================================
  // LISTA DE CITAS FILTRADAS
  // ========================================================

  get citasFiltradas(): any[] {

    const texto = this.busqueda
      .trim()
      .toLowerCase();

    return this.citas.filter(cita => {

      // ====================================================
      // FILTRAR POR ESTADO
      // ====================================================

      const estado = String(
        cita.estado ?? ''
      ).toUpperCase();

      const coincideEstado =
        this.filtroEstado === 'TODOS' ||
        estado === this.filtroEstado;


      // ====================================================
      // FILTRAR POR TEXTO
      // ====================================================

      const contenido = [

        cita.mascota?.nombre,

        cita.servicio?.nombre,

        cita.veterinario?.nombre,

        cita.motivo

      ]
        .map(valor => String(valor ?? ''))
        .join(' ')
        .toLowerCase();

      const coincideBusqueda =
        contenido.includes(texto);

      return coincideEstado && coincideBusqueda;

    });

  }


  // ========================================================
  // ESTADOS DISPONIBLES PARA EL FILTRO
  // ========================================================

  get estadosDisponibles(): string[] {

    // Usamos los estados reales devueltos por la API.
    return Array.from(

      new Set(

        this.citas
          .map(cita =>
            String(cita.estado ?? '').toUpperCase()
          )
          .filter(estado => estado.length > 0)

      )

    ).sort();

  }


  // ========================================================
  // TOTALES PARA LAS TARJETAS DE RESUMEN
  // ========================================================

  get totalPendientes(): number {

    return this.citas.filter(
      cita => cita.estado === 'PENDIENTE'
    ).length;

  }


  get totalCanceladas(): number {

    return this.citas.filter(
      cita => cita.estado === 'CANCELADA'
    ).length;

  }


  // ========================================================
  // IDENTIFICAR CITAS EN EL HTML
  // ========================================================

  trackByCita(
    index: number,
    cita: any
  ): number {

    return cita.id ?? index;

  }


  // ========================================================
  // OBTENER FECHA LOCAL PARA EL INPUT
  // ========================================================

  private actualizarFechaMinima(): void {

    const ahora = new Date();

    const anio = ahora.getFullYear();

    const mes = String(
      ahora.getMonth() + 1
    ).padStart(2, '0');

    const dia = String(
      ahora.getDate()
    ).padStart(2, '0');

    const hora = String(
      ahora.getHours()
    ).padStart(2, '0');

    const minuto = String(
      ahora.getMinutes()
    ).padStart(2, '0');

    this.fechaMinima =
      `${anio}-${mes}-${dia}T${hora}:${minuto}`;

  }


  // ========================================================
  // ABRIR FORMULARIO PARA NUEVA CITA
  // ========================================================

  nuevaCita(): void {

    if (this.guardando) {
      return;
    }

    this.citaEditandoId = null;

    this.actualizarFechaMinima();

    // Restablecemos los cinco campos.
    this.citaForm.reset({

      mascotaId: '',

      servicioId: '',

      veterinarioId: '',

      fechaHora: '',

      motivo: ''

    });

    this.mensajeError = '';

    this.mensajeExito = '';

    this.mostrarFormulario = true;

    this.enfocarFormulario();

  }


  // ========================================================
  // ABRIR FORMULARIO PARA EDITAR
  // ========================================================

  editarCita(cita: any): void {

    // Las citas canceladas no se editan desde USER.
    if (
      this.guardando ||
      cita.estado === 'CANCELADA'
    ) {
      return;
    }

    this.citaEditandoId = cita.id;

    this.actualizarFechaMinima();

    // Mantener los IDs de los objetos relacionados.
    this.citaForm.reset({

      mascotaId:
        cita.mascota?.id ?? '',

      servicioId:
        cita.servicio?.id ?? '',

      veterinarioId:
        cita.veterinario?.id ?? '',

      fechaHora:
        this.formatearFechaParaInput(cita.fechaHora),

      motivo:
        cita.motivo ?? ''

    });

    this.mensajeError = '';

    this.mensajeExito = '';

    this.mostrarFormulario = true;

    this.enfocarFormulario();

  }


  // ========================================================
  // MEJORA DE ACCESIBILIDAD: ENFOCAR EL FORMULARIO
  // ========================================================

  private enfocarFormulario(): void {

    // Actualiza el *ngIf del formulario.
    this.cd.detectChanges();

    // Enfoca el primer campo.
    this.selectorMascota?.nativeElement.focus();

  }


  // ========================================================
  // GUARDAR CITA - REGISTRAR O EDITAR
  // ========================================================

  guardarCita(): void {

    // Evitar dos peticiones simultáneas.
    if (this.guardando) {
      return;
    }

    this.mensajeError = '';

    this.mensajeExito = '';


    // ======================================================
    // VALIDAR CAMPOS OBLIGATORIOS
    // ======================================================

    if (this.citaForm.invalid) {

      this.citaForm.markAllAsTouched();

      return;
    }


    // ======================================================
    // OBTENER LOS VALORES
    // ======================================================

    const valores =
      this.citaForm.getRawValue();

    const motivo =
      String(valores.motivo ?? '').trim();

    const fechaHora =
      String(valores.fechaHora ?? '');


    // Impedir motivos compuestos solo por espacios.
    if (!motivo) {

      this.citaForm.get('motivo')?.setErrors({
        required: true
      });

      this.citaForm.get('motivo')?.markAsTouched();

      return;
    }


    // ======================================================
    // PREVENIR FECHAS PASADAS EN NUEVAS CITAS
    // ======================================================

    if (this.citaEditandoId === null) {

      const fechaElegida =
        new Date(fechaHora).getTime();

      const ahora =
        Date.now();

      if (
        !Number.isFinite(fechaElegida) ||
        fechaElegida <= ahora
      ) {

        const control =
          this.citaForm.get('fechaHora');

        control?.setErrors({
          fechaPasada: true
        });

        control?.markAsTouched();

        return;
      }

    }


    // ======================================================
    // ESTRUCTURA QUE ESPERA SPRING BOOT
    // ======================================================

    // Mantenemos exactamente las relaciones por ID
    // del formulario original.
    const datosCita = {

      fechaHora: fechaHora,

      motivo: motivo,

      mascota: {
        id: valores.mascotaId
      },

      veterinario: {
        id: valores.veterinarioId
      },

      servicio: {
        id: valores.servicioId
      }

    };


    // ======================================================
    // DETERMINAR SI REGISTRAMOS O EDITAMOS
    // ======================================================

    const esEdicion =
      this.citaEditandoId !== null;

    // Usamos los métodos del CitaServicio original.
    const peticion = esEdicion

      ? this.citaServicio.actualizarCita(
          this.citaEditandoId!,
          datosCita
        )

      : this.citaServicio.crearCita(
          datosCita
        );


    this.guardando = true;


    // ======================================================
    // EJECUTAR LA OPERACIÓN
    // ======================================================

    peticion.subscribe({


      // ====================================================
      // GUARDADO CORRECTO
      // ====================================================

      next: () => {

        this.guardando = false;

        this.mensajeExito = esEdicion
          ? 'Cita actualizada correctamente.'
          : 'Cita agendada correctamente.';

        // Se envía el aviso a la campana global.
        this.notificacionesServicio.agregar(

          esEdicion
            ? 'Cita actualizada'
            : 'Nueva cita registrada',

          esEdicion
            ? 'Los cambios de la cita se guardaron correctamente.'
            : 'Tu cita veterinaria fue registrada correctamente.',

          'exito'

        );

        this.cerrarFormulario();

        // Consultamos los datos actualizados.
        // NO recargamos la página completa.
        this.cargarDatos();

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
          'No se pudo guardar la cita. Revisa los datos e intenta nuevamente.';

        this.notificacionesServicio.agregar(

          'Error al guardar cita',

          'No se pudieron guardar los datos de la cita.',

          'error'

        );

        this.cd.detectChanges();

      }

    });

  }


  // ========================================================
  // CANCELAR CITA
  // ========================================================

  cancelarCita(cita: any): void {

    // Impedir cancelar una cita ya cancelada.
    if (
      cita.estado === 'CANCELADA' ||
      this.cancelandoId !== null
    ) {
      return;
    }


    // Se conserva la confirmación de seguridad.
    const confirmado = window.confirm(
      `¿Deseas cancelar la cita de ${cita.mascota?.nombre ?? 'tu mascota'}?`
    );

    if (!confirmado) {
      return;
    }


    this.cancelandoId = cita.id;

    this.mensajeError = '';

    this.mensajeExito = '';


    // Endpoint original:
    // PUT /api/citas/{id}/cancelar
    this.citaServicio
      .cancelarCita(cita.id)
      .subscribe({


        // ==================================================
        // CANCELACIÓN CORRECTA
        // ==================================================

        next: () => {

          this.cancelandoId = null;

          this.mensajeExito =
            'La cita fue cancelada correctamente.';

          this.notificacionesServicio.agregar(
            'Cita cancelada',
            `Se canceló la cita de ${cita.mascota?.nombre ?? 'tu mascota'}.`,
            'exito'
          );

          this.cargarDatos();

        },


        // ==================================================
        // ERROR AL CANCELAR
        // ==================================================

        error: (error) => {

          console.error(
            'Error al cancelar cita:',
            error
          );

          this.cancelandoId = null;

          this.mensajeError =
            error?.error?.mensaje ||
            error?.error?.message ||
            'No se pudo cancelar la cita.';

          this.notificacionesServicio.agregar(
            'Error al cancelar',
            'No fue posible cancelar la cita.',
            'error'
          );

          this.cd.detectChanges();

        }

      });

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
  // FORMATEAR FECHA PARA INPUT DATETIME-LOCAL
  // ========================================================

  formatearFechaParaInput(
    fecha: string
  ): string {

    if (!fecha) {
      return '';
    }

    // Convierte:
    // 2026-10-25T10:30:00
    //
    // A:
    // 2026-10-25T10:30
    return String(fecha).substring(0, 16);

  }


  // ========================================================
  // VOLVER AL DASHBOARD USER
  // ========================================================

  volverDashboard(): void {

    void this.router.navigate([
      '/usuario/dashboard'
    ]);

  }


  // ========================================================
  // IR A MIS MASCOTAS
  // ========================================================

  irMascotas(): void {

    void this.router.navigate([
      '/usuario/mascotas'
    ]);

  }

}
