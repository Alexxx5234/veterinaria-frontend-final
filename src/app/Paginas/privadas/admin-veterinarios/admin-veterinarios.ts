
/* ==========================================================
   VETERINARIA AREVALO
   ADMINISTRACIÓN DE VETERINARIOS (ADMIN)

   FUNCIONALIDADES:
   - Consultar veterinarios registrados.
   - Mostrar total de profesionales.
   - Buscar por nombre, cédula o especialidad.
   - Filtrar por especialidad.
   - Ordenar los resultados.
   - Registrar, editar y eliminar veterinarios.
   - Validar los campos del formulario.
   - Confirmar antes de eliminar.
   - Notificaciones globales.
   - Estados de carga y errores.

   Los veterinarios son profesionales registrados,
   no constituyen un tercer rol de inicio de sesión.
   ========================================================== */

// ==========================================================
// IMPORTACIONES ANGULAR
// ==========================================================

import {
  Component,
  OnInit,
  ChangeDetectorRef,
  ElementRef,
  ViewChild
} from '@angular/core';

// Permite utilizar *ngIf y *ngFor.
import { CommonModule } from '@angular/common';

// Formularios y filtros.
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';

// Navegación.
import { Router } from '@angular/router';

// Crear o actualizar mediante Observable.
import { Observable } from 'rxjs';

// ==========================================================
// SERVICIOS
// ==========================================================

// Métodos REST de veterinarios.
import { VeterinarioServicio }
  from '../../../Servicios/veterinario-servicio';

// Campana de notificaciones del LayoutPrivado.
import { NotificacionesServicio }
  from '../../../Servicios/notificaciones-servicio';

// ==========================================================
// INTERFAZ DE VETERINARIO
// ==========================================================

// Campos utilizados por Veterinario.java.
interface VeterinarioAdmin {
  id: number;
  cedula: string;
  nombre: string;
  apellido: string;
  especialidad: string;
  telefono: string;
  email: string;
}

// ==========================================================
// COMPONENTE
// ==========================================================

@Component({
  selector: 'app-admin-veterinarios',
  standalone: true,

  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule
  ],

  templateUrl: './admin-veterinarios.html',
  styleUrl: './admin-veterinarios.scss'
})
export class AdminVeterinarios implements OnInit {

  // ========================================================
  // LISTA DE VETERINARIOS
  // ========================================================

  veterinarios: VeterinarioAdmin[] = [];

  // ========================================================
  // ESTADOS DE LA INTERFAZ
  // ========================================================

  cargando: boolean = false;
  errorCarga: boolean = false;

  // Evita repetir solicitudes POST o PUT.
  guardando: boolean = false;

  // Identifica al veterinario que se elimina.
  eliminandoId: number | null = null;

  mensajeError: string = '';
  mensajeExito: string = '';

  // ========================================================
  // BUSCADOR Y FILTROS
  // ========================================================

  busqueda: string = '';

  filtroEspecialidad: string = 'TODAS';

  ordenarPor: string = 'nombreAsc';

  // ========================================================
  // FORMULARIO
  // ========================================================

  veterinarioForm: FormGroup;

  mostrarFormulario: boolean = false;

  // null = nuevo veterinario.
  // número = modificar veterinario.
  veterinarioEditandoId: number | null = null;

  // Para colocar el cursor en el primer campo.
  @ViewChild('campoCedula')
  campoCedula?: ElementRef<HTMLInputElement>;

  // ========================================================
  // CONSTRUCTOR
  // ========================================================

  constructor(
    private veterinarioServicio: VeterinarioServicio,
    private notificacionesServicio: NotificacionesServicio,
    private fb: FormBuilder,
    private router: Router,
    private cd: ChangeDetectorRef
  ) {

    // Los nombres coinciden con la entidad Veterinario.
    this.veterinarioForm = this.fb.group({

      // Exactamente diez números.
      cedula: [
        '',
        [
          Validators.required,
          Validators.pattern(/^[0-9]{10}$/)
        ]
      ],

      nombre: [
        '',
        Validators.required
      ],

      apellido: [
        '',
        Validators.required
      ],

      especialidad: [
        '',
        Validators.required
      ],

      telefono: [
        '',
        Validators.required
      ],

      email: [
        '',
        [
          Validators.required,
          Validators.email
        ]
      ]

    });

  }

  // ========================================================
  // AL ABRIR LA PÁGINA
  // ========================================================

  ngOnInit(): void {
    this.cargarVeterinarios();
  }

  // ========================================================
  // NORMALIZAR BÚSQUEDAS
  // ========================================================

  // Permite buscar sin distinguir tildes y mayúsculas.
  private normalizarTexto(valor: unknown): string {

    return String(valor ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();

  }

  // ========================================================
  // CONSULTAR VETERINARIOS
  // ========================================================

  cargarVeterinarios(
    actualizacionManual: boolean = false
  ): void {

    if (
      this.cargando ||
      this.guardando ||
      this.eliminandoId !== null
    ) {
      return;
    }

    this.cargando = true;
    this.errorCarga = false;
    this.mensajeError = '';

    // GET /api/veterinarios
    this.veterinarioServicio
      .listarVeterinarios()
      .subscribe({

        // --------------------------------------------------
        // RESPUESTA CORRECTA
        // --------------------------------------------------
        next: (respuesta) => {

          this.veterinarios = Array.isArray(respuesta)
            ? respuesta
            : [];

          this.cargando = false;
          this.errorCarga = false;

          if (actualizacionManual) {

            this.mensajeExito =
              'El listado de veterinarios se actualizó correctamente.';

            this.notificacionesServicio.agregar(
              'Veterinarios actualizados',
              'Se consultó nuevamente el listado de profesionales.',
              'info'
            );

          }

          this.cd.detectChanges();

        },

        // --------------------------------------------------
        // ERROR
        // --------------------------------------------------
        error: (error) => {

          console.error(
            'Error al cargar veterinarios:',
            error
          );

          this.cargando = false;
          this.errorCarga = true;

          this.mensajeError =
            error?.status === 0
              ? 'No se pudo conectar con Spring Boot. Comprueba que el servidor esté encendido.'
              : 'No se pudieron cargar los veterinarios. Intenta nuevamente.';

          this.notificacionesServicio.agregar(
            'Error al consultar veterinarios',
            'No fue posible obtener el listado de profesionales.',
            'error'
          );

          this.cd.detectChanges();

        }

      });

  }

  // ========================================================
  // TOTAL DE VETERINARIOS
  // ========================================================

  // Solo una tarjeta de resumen, sin dividirla
  // por especialidades.
  get totalVeterinarios(): number {
    return this.veterinarios.length;
  }

  // ========================================================
  // ESPECIALIDADES DISPONIBLES
  // ========================================================

  // Genera las opciones del filtro a partir
  // de los datos reales recibidos desde la API.
  get especialidadesDisponibles(): string[] {

    const especialidades = new Map<string, string>();

    for (const veterinario of this.veterinarios) {

      const nombre = String(
        veterinario.especialidad ?? ''
      ).trim();

      const clave = this.normalizarTexto(nombre);

      if (nombre && !especialidades.has(clave)) {
        especialidades.set(clave, nombre);
      }

    }

    return Array.from(especialidades.values())
      .sort((a, b) =>
        a.localeCompare(
          b,
          'es',
          { sensitivity: 'base' }
        )
      );

  }

  // ========================================================
  // BUSCAR, FILTRAR Y ORDENAR
  // ========================================================

  get veterinariosFiltrados(): VeterinarioAdmin[] {

    const texto =
      this.normalizarTexto(this.busqueda);

    const especialidadBuscada =
      this.normalizarTexto(this.filtroEspecialidad);

    const resultado = this.veterinarios.filter(
      veterinario => {

        // Datos donde se puede buscar.
        const contenido = this.normalizarTexto([

          veterinario.id,
          veterinario.cedula,
          veterinario.nombre,
          veterinario.apellido,
          veterinario.especialidad,
          veterinario.telefono,
          veterinario.email

        ].join(' '));

        const coincideBusqueda =
          contenido.includes(texto);

        const coincideEspecialidad =
          this.filtroEspecialidad === 'TODAS' ||
          this.normalizarTexto(
            veterinario.especialidad
          ) === especialidadBuscada;

        return coincideBusqueda &&
          coincideEspecialidad;

      }
    );

    // Ordenar sin modificar la lista original.
    return [...resultado].sort((a, b) => {

      if (this.ordenarPor === 'especialidadAsc') {

        return String(a.especialidad ?? '')
          .localeCompare(
            String(b.especialidad ?? ''),
            'es',
            { sensitivity: 'base' }
          );

      }

      const nombreA =
        `${a.nombre ?? ''} ${a.apellido ?? ''}`.trim();

      const nombreB =
        `${b.nombre ?? ''} ${b.apellido ?? ''}`.trim();

      const comparacion =
        nombreA.localeCompare(
          nombreB,
          'es',
          { sensitivity: 'base' }
        );

      return this.ordenarPor === 'nombreDesc'
        ? -comparacion
        : comparacion;

    });

  }

  // ========================================================
  // LIMPIAR FILTROS
  // ========================================================

  limpiarFiltros(): void {

    this.busqueda = '';
    this.filtroEspecialidad = 'TODAS';
    this.ordenarPor = 'nombreAsc';

  }

  // ========================================================
  // COMPROBAR CAMPOS CON ERRORES
  // ========================================================

  campoInvalido(nombre: string): boolean {

    const control = this.veterinarioForm.get(nombre);

    return !!control &&
      control.invalid &&
      (control.touched || control.dirty);

  }

  // ========================================================
  // OPERACIÓN EN CURSO
  // ========================================================

  get hayOperacionEnCurso(): boolean {

    return this.guardando ||
      this.eliminandoId !== null;

  }

  // ========================================================
  // ABRIR FORMULARIO PARA REGISTRAR
  // ========================================================

  nuevoVeterinario(): void {

    if (this.cargando || this.hayOperacionEnCurso) {
      return;
    }

    this.veterinarioEditandoId = null;

    this.veterinarioForm.reset({

      cedula: '',
      nombre: '',
      apellido: '',
      especialidad: '',
      telefono: '',
      email: ''

    });

    this.mensajeError = '';
    this.mensajeExito = '';

    this.mostrarFormulario = true;

    this.cd.detectChanges();

    // Enfocar el primer campo.
    this.campoCedula?.nativeElement.focus();

  }

  // ========================================================
  // ABRIR FORMULARIO PARA EDITAR
  // ========================================================

  editarVeterinario(
    veterinario: VeterinarioAdmin
  ): void {

    if (this.cargando || this.hayOperacionEnCurso) {
      return;
    }

    this.veterinarioEditandoId = veterinario.id;

    // Cargar los seis campos de Veterinario.java.
    this.veterinarioForm.reset({

      cedula: veterinario.cedula,
      nombre: veterinario.nombre,
      apellido: veterinario.apellido,
      especialidad: veterinario.especialidad,
      telefono: veterinario.telefono,
      email: veterinario.email

    });

    this.mensajeError = '';
    this.mensajeExito = '';

    this.mostrarFormulario = true;

    this.cd.detectChanges();

    this.campoCedula?.nativeElement.focus();

  }

  // ========================================================
  // GUARDAR VETERINARIO
  // ========================================================

  guardarVeterinario(): void {

    if (this.cargando || this.hayOperacionEnCurso) {
      return;
    }

    this.mensajeError = '';

    // ------------------------------------------------------
    // VALIDAR FORMULARIO
    // ------------------------------------------------------
    if (this.veterinarioForm.invalid) {

      this.veterinarioForm.markAllAsTouched();

      return;

    }

    const valores =
      this.veterinarioForm.getRawValue();

    // Limpiar espacios antes de enviar.
    const datosVeterinario = {

      cedula: String(valores.cedula ?? '').trim(),

      nombre: String(valores.nombre ?? '').trim(),

      apellido: String(valores.apellido ?? '').trim(),

      especialidad:
        String(valores.especialidad ?? '').trim(),

      telefono: String(valores.telefono ?? '').trim(),

      email: String(valores.email ?? '').trim()

    };

    // Los campos de texto no pueden ser solo espacios.
    const camposTexto = [
      'nombre',
      'apellido',
      'especialidad',
      'telefono'
    ];

    let hayCamposVacios = false;

    for (const campo of camposTexto) {

      const valor =
        String(valores[campo] ?? '').trim();

      if (!valor) {

        this.veterinarioForm
          .get(campo)
          ?.setErrors({ required: true });

        hayCamposVacios = true;

      }

    }

    if (hayCamposVacios) {

      this.veterinarioForm.markAllAsTouched();

      return;

    }

    // ------------------------------------------------------
    // CREAR O EDITAR
    // ------------------------------------------------------

    const editando =
      this.veterinarioEditandoId !== null;

    const peticion: Observable<any> = editando

      ? this.veterinarioServicio
          .actualizarVeterinario(
            this.veterinarioEditandoId!,
            datosVeterinario
          )

      : this.veterinarioServicio
          .crearVeterinario(datosVeterinario);

    this.guardando = true;
    this.mensajeExito = '';

    peticion.subscribe({

      // ----------------------------------------------------
      // OPERACIÓN CORRECTA
      // ----------------------------------------------------
      next: () => {

        this.guardando = false;

        this.cerrarFormulario();

        this.mensajeExito = editando
          ? 'Veterinario actualizado correctamente.'
          : 'Veterinario registrado correctamente.';

        this.notificacionesServicio.agregar(
          editando
            ? 'Veterinario actualizado'
            : 'Veterinario registrado',
          `${this.mensajeExito} ${datosVeterinario.nombre} ${datosVeterinario.apellido}.`,
          'exito'
        );

        this.cargarVeterinarios();

        this.cd.detectChanges();

      },

      // ----------------------------------------------------
      // ERROR DEL BACKEND
      // ----------------------------------------------------
      error: (error) => {

        console.error(
          'Error al guardar veterinario:',
          error
        );

        this.guardando = false;

        this.mensajeError =
          error?.error?.mensaje ||
          error?.error?.message ||
          'No se pudo guardar el veterinario. Revisa los datos.';

        this.notificacionesServicio.agregar(
          'Error al guardar veterinario',
          'No se pudo completar el registro o la edición.',
          'error'
        );

        this.cd.detectChanges();

      }

    });

  }

  // ========================================================
  // ELIMINAR VETERINARIO
  // ========================================================

  eliminarVeterinario(
    veterinario: VeterinarioAdmin
  ): void {

    if (this.cargando || this.hayOperacionEnCurso) {
      return;
    }

    // Solicitar confirmación antes del DELETE.
    const confirmado = window.confirm(

      `¿Estás seguro de eliminar permanentemente a ` +
      `${veterinario.nombre} ${veterinario.apellido}? ` +
      `Esta acción no se puede deshacer.`

    );

    if (!confirmado) {
      return;
    }

    this.eliminandoId = veterinario.id;

    this.mensajeError = '';
    this.mensajeExito = '';

    // DELETE /api/veterinarios/{id}
    this.veterinarioServicio
      .eliminarVeterinario(veterinario.id)
      .subscribe({

        // --------------------------------------------------
        // ELIMINACIÓN CORRECTA
        // --------------------------------------------------
        next: () => {

          this.eliminandoId = null;

          if (
            this.veterinarioEditandoId === veterinario.id
          ) {
            this.cerrarFormulario();
          }

          this.mensajeExito =
            'Veterinario eliminado correctamente.';

          this.notificacionesServicio.agregar(
            'Veterinario eliminado',
            `Se eliminó a ${veterinario.nombre} ${veterinario.apellido}.`,
            'exito'
          );

          this.cargarVeterinarios();

        },

        // --------------------------------------------------
        // ERROR DE ELIMINACIÓN
        // --------------------------------------------------
        error: (error) => {

          console.error(
            'Error al eliminar veterinario:',
            error
          );

          this.eliminandoId = null;

          this.mensajeError =
            error?.error?.mensaje ||
            error?.error?.message ||
            'No se pudo eliminar el veterinario. Puede tener citas asociadas.';

          this.notificacionesServicio.agregar(
            'Error al eliminar veterinario',
            `No se pudo eliminar a ${veterinario.nombre}.`,
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

    // No cerrar mientras se realiza el PUT o POST.
    if (this.guardando) {
      return;
    }

    this.mostrarFormulario = false;
    this.veterinarioEditandoId = null;

    this.veterinarioForm.reset();

    this.cd.detectChanges();

  }

  // ========================================================
  // IDENTIFICAR VETERINARIOS EN EL HTML
  // ========================================================

  trackByVeterinario(
    index: number,
    veterinario: VeterinarioAdmin
  ): number {

    return veterinario.id ?? index;

  }

  // ========================================================
  // REGRESAR AL DASHBOARD ADMIN
  // ========================================================

  volverDashboard(): void {

    void this.router.navigate([
      '/admin/dashboard'
    ]);

  }

}
