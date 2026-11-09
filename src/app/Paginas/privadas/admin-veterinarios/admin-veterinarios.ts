
/* ==========================================================
   VETERINARIA ARÉVALO
   ADMINISTRACIÓN DE VETERINARIOS

   FUNCIONES:
   1. Listar veterinarios.
   2. Buscar por nombre, cédula y especialidad.
   3. Filtrar y ordenar.
   4. Seleccionar usuarios existentes.
   5. Registrar veterinarios vinculando cuentas.
   6. Asignar automáticamente el rol VETERINARIO.
   7. Editar datos profesionales.
   8. Eliminar de forma protegida.
   9. Validar formularios.
   10. Mostrar notificaciones y errores.

   IMPORTANTE:
   No se crean usuarios duplicados.
   No se modifica la contraseña de la cuenta.
========================================================== */


// ==========================================================
// 1. IMPORTACIONES
// ==========================================================

import {
  Component,
  OnInit,
  ChangeDetectorRef,
  ElementRef,
  ViewChild
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

import { Observable } from 'rxjs';


// ==========================================================
// 2. SERVICIOS
// ==========================================================

import {
  VeterinarioServicio,
  Veterinario,
  RegistroVeterinarioDesdeUsuario
} from '../../../Servicios/veterinario-servicio';

import {
  AdminUsuarioServicio,
  UsuarioAdmin
} from '../../../Servicios/admin-usuario-servicio';

import {
  NotificacionesServicio
} from '../../../Servicios/notificaciones-servicio';


// ==========================================================
// 3. COMPONENTE
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
  // 4. LISTAS PRINCIPALES
  // ========================================================

  veterinarios: Veterinario[] = [];

  usuariosDisponibles: UsuarioAdmin[] = [];


  // ========================================================
  // 5. ESTADOS DE CARGA
  // ========================================================

  cargando = false;

  cargandoUsuarios = false;

  guardando = false;

  errorCarga = false;

  errorUsuarios = false;

  eliminandoId: number | null = null;


  // ========================================================
  // 6. MENSAJES
  // ========================================================

  mensajeError = '';

  mensajeExito = '';


  // ========================================================
  // 7. BÚSQUEDA Y FILTROS
  // ========================================================

  busqueda = '';

  filtroEspecialidad = 'TODAS';

  ordenarPor = 'nombreAsc';


  // ========================================================
  // 8. FORMULARIO
  // ========================================================

  veterinarioForm: FormGroup;

  mostrarFormulario = false;

  veterinarioEditandoId: number | null = null;

  // Conserva la ficha original durante la edición.
  veterinarioEditando: Veterinario | null = null;


  // ========================================================
  // 9. REFERENCIAS PARA ACCESIBILIDAD
  // ========================================================

  @ViewChild('campoCedula')
  campoCedula?: ElementRef<HTMLInputElement>;

  @ViewChild('campoUsuario')
  campoUsuario?: ElementRef<HTMLSelectElement>;


  // ========================================================
  // 10. CONSTRUCTOR
  // ========================================================

  constructor(

    private veterinarioServicio: VeterinarioServicio,

    private adminUsuarioServicio: AdminUsuarioServicio,

    private notificacionesServicio: NotificacionesServicio,

    private fb: FormBuilder,

    private router: Router,

    private cd: ChangeDetectorRef

  ) {

    /*
      El formulario tiene únicamente los datos
      que realmente necesita el backend.

      Para registrar:
      usuarioId, cedula, especialidad y telefono.

      Para editar:
      cedula, especialidad y telefono.
    */

    this.veterinarioForm = this.fb.group({

      usuarioId: [
        null
      ],

      cedula: [
        '',
        [
          Validators.required,
          Validators.pattern(/^[0-9]{10}$/)
        ]
      ],

      especialidad: [
        '',
        Validators.required
      ],

      telefono: [
        '',
        Validators.required
      ]

    });

  }


  // ========================================================
  // 11. INICIALIZACIÓN
  // ========================================================

  ngOnInit(): void {

    this.cargarVeterinarios();

  }


  // ========================================================
  // 12. NORMALIZAR TEXTO
  // ========================================================

  private normalizarTexto(valor: unknown): string {

    return String(valor ?? '')

      .normalize('NFD')

      .replace(/[\u0300-\u036f]/g, '')

      .trim()

      .toLowerCase();

  }


  // ========================================================
  // 13. TOTAL DE VETERINARIOS
  // ========================================================

  get totalVeterinarios(): number {

    return this.veterinarios.length;

  }


  // ========================================================
  // 14. COMPROBAR OPERACIONES
  // ========================================================

  get hayOperacionEnCurso(): boolean {

    return (

      this.guardando ||

      this.eliminandoId !== null

    );

  }


  // ========================================================
  // 15. USUARIOS QUE SE PUEDEN ASIGNAR
  // ========================================================

  /*
    Además de los filtros del servicio, se excluyen
    cuentas cuyo correo ya aparece en una ficha
    veterinaria existente.

    Esto evita presentar cuentas duplicadas
    en el selector.
  */

  get usuariosElegibles(): UsuarioAdmin[] {

    const correosRegistrados = new Set(

      this.veterinarios

        .map(v => this.normalizarTexto(v.email))

        .filter(correo => correo.length > 0)

    );

    return this.usuariosDisponibles.filter(usuario => {

      const correo = this.normalizarTexto(
        usuario.correo
      );

      return (
        correo.length > 0 &&
        !correosRegistrados.has(correo)
      );

    });

  }


  // ========================================================
  // 16. USUARIO SELECCIONADO
  // ========================================================

  get usuarioSeleccionado(): UsuarioAdmin | null {

    const id = Number(
      this.veterinarioForm.get('usuarioId')?.value
    );

    if (!id) {
      return null;
    }

    return this.usuariosElegibles.find(
      usuario => usuario.id === id
    ) ?? null;

  }


  // ========================================================
  // 17. CARGAR VETERINARIOS
  // ========================================================

  cargarVeterinarios(
    actualizacionManual = false
  ): void {

    if (
      this.cargando ||
      this.hayOperacionEnCurso
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

        next: respuesta => {

          this.veterinarios = Array.isArray(respuesta)

            ? respuesta

            : [];

          this.cargando = false;

          this.errorCarga = false;

          if (actualizacionManual) {

            this.mensajeExito =
              'Listado de veterinarios actualizado correctamente.';

            this.notificacionesServicio.agregar(

              'Veterinarios actualizados',

              'El listado de profesionales se actualizó correctamente.',

              'info'

            );

          }

          this.cd.detectChanges();

        },

        error: error => {

          console.error(
            'Error al consultar veterinarios:',
            error
          );

          this.cargando = false;

          this.errorCarga = true;

          this.mensajeError = error?.status === 0

            ? 'No se pudo conectar con Spring Boot.'

            : 'No se pudieron cargar los veterinarios.';

          this.notificacionesServicio.agregar(

            'Error de consulta',

            'No fue posible cargar los veterinarios.',

            'error'

          );

          this.cd.detectChanges();

        }

      });

  }


  // ========================================================
  // 18. CARGAR USUARIOS DISPONIBLES
  // ========================================================

  /*
    GET /api/admin/usuarios

    El servicio filtra las cuentas:
    - USER.
    - Correo verificado.
    - Estado PENDIENTE o APROBADA.
  */

  cargarUsuariosDisponibles(): void {

    if (this.cargandoUsuarios) {
      return;
    }

    this.cargandoUsuarios = true;

    this.errorUsuarios = false;

    this.adminUsuarioServicio

      .listarUsuariosDisponiblesParaVeterinario()

      .subscribe({

        next: respuesta => {

          this.usuariosDisponibles = Array.isArray(respuesta)

            ? respuesta

            : [];

          this.cargandoUsuarios = false;

          this.errorUsuarios = false;

          this.cd.detectChanges();

        },

        error: error => {

          console.error(
            'Error al consultar usuarios disponibles:',
            error
          );

          this.cargandoUsuarios = false;

          this.errorUsuarios = true;

          this.mensajeError =
            'No se pudieron consultar las cuentas disponibles.';

          this.cd.detectChanges();

        }

      });

  }


  // ========================================================
  // 19. ESPECIALIDADES DISPONIBLES
  // ========================================================

  get especialidadesDisponibles(): string[] {

    const especialidades = new Map<string, string>();

    for (const veterinario of this.veterinarios) {

      const nombre = String(
        veterinario.especialidad ?? ''
      ).trim();

      const clave = this.normalizarTexto(nombre);

      if (
        nombre &&
        !especialidades.has(clave)
      ) {

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
  // 20. BUSCAR, FILTRAR Y ORDENAR
  // ========================================================

  get veterinariosFiltrados(): Veterinario[] {

    const texto = this.normalizarTexto(
      this.busqueda
    );

    const especialidad = this.normalizarTexto(
      this.filtroEspecialidad
    );

    const resultado = this.veterinarios.filter(v => {

      const contenido = this.normalizarTexto([

        v.id,
        v.cedula,
        v.nombre,
        v.apellido,
        v.especialidad,
        v.telefono,
        v.email

      ].join(' '));

      const coincideTexto =
        contenido.includes(texto);

      const coincideEspecialidad =

        this.filtroEspecialidad === 'TODAS' ||

        this.normalizarTexto(v.especialidad) === especialidad;

      return coincideTexto && coincideEspecialidad;

    });

    return [...resultado].sort((a, b) => {

      if (this.ordenarPor === 'especialidadAsc') {

        return String(a.especialidad ?? '').localeCompare(

          String(b.especialidad ?? ''),

          'es',

          { sensitivity: 'base' }

        );

      }

      const nombreA =
        `${a.nombre ?? ''} ${a.apellido ?? ''}`;

      const nombreB =
        `${b.nombre ?? ''} ${b.apellido ?? ''}`;

      const comparacion = nombreA.localeCompare(

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
  // 21. LIMPIAR FILTROS
  // ========================================================

  limpiarFiltros(): void {

    this.busqueda = '';

    this.filtroEspecialidad = 'TODAS';

    this.ordenarPor = 'nombreAsc';

  }


  // ========================================================
  // 22. VALIDAR CAMPOS
  // ========================================================

  campoInvalido(nombre: string): boolean {

    const control = this.veterinarioForm.get(nombre);

    return !!control &&

      control.invalid &&

      (control.touched || control.dirty);

  }


  // ========================================================
  // 23. ABRIR REGISTRO DE NUEVO VETERINARIO
  // ========================================================

  nuevoVeterinario(): void {

    if (
      this.cargando ||
      this.hayOperacionEnCurso
    ) {
      return;
    }

    this.veterinarioEditandoId = null;

    this.veterinarioEditando = null;

    // El ID del usuario es obligatorio al registrar.

    const controlUsuario =
      this.veterinarioForm.get('usuarioId');

    controlUsuario?.setValidators([
      Validators.required
    ]);

    controlUsuario?.updateValueAndValidity();

    this.veterinarioForm.reset({

      usuarioId: null,

      cedula: '',

      especialidad: '',

      telefono: ''

    });

    this.mensajeError = '';

    this.mensajeExito = '';

    this.mostrarFormulario = true;

    // Cargar las cuentas existentes.

    this.cargarUsuariosDisponibles();

    this.cd.detectChanges();

    this.campoUsuario?.nativeElement.focus();

  }


  // ========================================================
  // 24. EDITAR VETERINARIO
  // ========================================================

  /*
    La cuenta de usuario no se cambia durante
    la edición de los datos profesionales.

    Se conservan nombre y correo originales.
  */

  editarVeterinario(veterinario: Veterinario): void {

    if (
      this.cargando ||
      this.hayOperacionEnCurso
    ) {
      return;
    }

    this.veterinarioEditandoId = veterinario.id;

    this.veterinarioEditando = veterinario;

    // El selector de usuario no es necesario al editar.

    const controlUsuario =
      this.veterinarioForm.get('usuarioId');

    controlUsuario?.clearValidators();

    controlUsuario?.updateValueAndValidity();

    this.veterinarioForm.reset({

      usuarioId: null,

      cedula: veterinario.cedula ?? '',

      especialidad: veterinario.especialidad ?? '',

      telefono: veterinario.telefono ?? ''

    });

    this.mensajeError = '';

    this.mensajeExito = '';

    this.mostrarFormulario = true;

    this.cd.detectChanges();

    this.campoCedula?.nativeElement.focus();

  }


  // ========================================================
  // 25. GUARDAR VETERINARIO
  // ========================================================

  /*
    NUEVO REGISTRO:
    POST /api/veterinarios/desde-usuario

    EDICIÓN:
    PUT /api/veterinarios/{id}
  */

  guardarVeterinario(): void {

    if (
      this.guardando ||
      this.cargando
    ) {
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

    const cedula = String(
      valores.cedula ?? ''
    ).trim();

    const especialidad = String(
      valores.especialidad ?? ''
    ).trim();

    const telefono = String(
      valores.telefono ?? ''
    ).trim();


    // ------------------------------------------------------
    // VALIDAR DATOS PROFESIONALES
    // ------------------------------------------------------

    if (!cedula || !especialidad || !telefono) {

      this.mensajeError =
        'Completa todos los datos profesionales.';

      return;

    }

    if (!/^[0-9]{10}$/.test(cedula)) {

      this.mensajeError =
        'La cédula debe contener exactamente 10 números.';

      return;

    }


    // ------------------------------------------------------
    // DETERMINAR OPERACIÓN
    // ------------------------------------------------------

    const editando =
      this.veterinarioEditandoId !== null;

    let peticion: Observable<Veterinario>;


    // ======================================================
    // 25.1. NUEVO VETERINARIO DESDE USUARIO
    // ======================================================

    if (!editando) {

      const usuarioId = Number(valores.usuarioId);

      // Comprobar que se seleccionó una cuenta real.

      const usuarioValido = this.usuariosElegibles.some(

        usuario => usuario.id === usuarioId

      );

      if (
        !Number.isInteger(usuarioId) ||
        usuarioId <= 0 ||
        !usuarioValido
      ) {

        this.mensajeError =
          'Selecciona una cuenta de usuario verificada y disponible.';

        this.veterinarioForm
          .get('usuarioId')
          ?.markAsTouched();

        return;

      }

      /*
        Este objeto coincide exactamente
        con el DTO del backend.
      */

      const datos: RegistroVeterinarioDesdeUsuario = {

        usuarioId,

        cedula,

        especialidad,

        telefono

      };

      // POST /api/veterinarios/desde-usuario

      peticion = this.veterinarioServicio

        .registrarDesdeUsuario(datos);

    }


    // ======================================================
    // 25.2. ACTUALIZAR DATOS PROFESIONALES
    // ======================================================

    else {

      const veterinarioActual =

        this.veterinarioEditando ??

        this.veterinarios.find(

          v => v.id === this.veterinarioEditandoId

        );

      if (!veterinarioActual) {

        this.mensajeError =
          'No se encontró el veterinario que deseas editar.';

        return;

      }

      /*
        El backend PUT actualiza nombre, apellido y email.

        Por eso enviamos sus valores actuales para
        conservar la cuenta vinculada y no modificarlos.
      */

      const datosActualizacion: Partial<Veterinario> = {

        cedula,

        nombre: veterinarioActual.nombre,

        apellido: veterinarioActual.apellido ?? '',

        especialidad,

        telefono,

        email: veterinarioActual.email

      };

      peticion = this.veterinarioServicio

        .actualizarVeterinario(

          this.veterinarioEditandoId!,

          datosActualizacion

        );

    }


    // ======================================================
    // 25.3. EJECUTAR OPERACIÓN
    // ======================================================

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

          ? 'Datos profesionales actualizados correctamente.'

          : 'Veterinario asignado correctamente. La cuenta ahora tiene el rol VETERINARIO.';

        this.notificacionesServicio.agregar(

          editando
            ? 'Veterinario actualizado'
            : 'Veterinario asignado',

          this.mensajeExito,

          'exito'

        );

        // Actualizar los profesionales.

        this.cargarVeterinarios();

        this.cd.detectChanges();

      },


      // ----------------------------------------------------
      // ERROR DEL BACKEND
      // ----------------------------------------------------

      error: error => {

        console.error(
          'Error al guardar veterinario:',
          error
        );

        this.guardando = false;

        const detalle =

          error?.error?.detail ||

          error?.error?.mensaje ||

          error?.error?.message;

        if (error?.status === 409) {

          this.mensajeError = detalle ||

            'La cuenta ya está asignada o no cumple los requisitos.';

        } else {

          this.mensajeError = detalle ||

            'No se pudo guardar el veterinario. Comprueba los datos y la conexión.';

        }

        this.notificacionesServicio.agregar(

          'No se pudo completar la operación',

          this.mensajeError,

          'error'

        );

        this.cd.detectChanges();

      }

    });

  }


  // ========================================================
  // 26. ELIMINAR VETERINARIO
  // ========================================================

  /*
    Requiere aplicar la corrección del controlador
    backend indicada más adelante.

    El backend impedirá eliminar profesionales
    que tengan citas asociadas y devolverá la cuenta
    vinculada al rol USER cuando sea posible.
  */

  eliminarVeterinario(veterinario: Veterinario): void {

    if (
      this.cargando ||
      this.hayOperacionEnCurso
    ) {
      return;
    }

    const nombre =

      `${veterinario.nombre ?? ''} ${veterinario.apellido ?? ''}`.trim();

    const confirmado = window.confirm(

      `¿Deseas eliminar la ficha profesional de ${nombre}? ` +

      `Si tiene citas asociadas, el sistema impedirá la eliminación. ` +

      `La cuenta vinculada volverá al rol USER si la operación es válida.`

    );

    if (!confirmado) {
      return;
    }

    this.eliminandoId = veterinario.id;

    this.mensajeError = '';

    this.mensajeExito = '';

    this.veterinarioServicio

      .eliminarVeterinario(veterinario.id)

      .subscribe({

        next: () => {

          this.eliminandoId = null;

          this.mensajeExito =
            'Ficha profesional eliminada correctamente.';

          this.notificacionesServicio.agregar(

            'Veterinario eliminado',

            `${nombre} ya no tiene una ficha profesional activa.`,

            'exito'

          );

          this.cargarVeterinarios();

        },

        error: error => {

          console.error(
            'Error al eliminar veterinario:',
            error
          );

          this.eliminandoId = null;

          this.mensajeError =

            error?.error?.detail ||

            error?.error?.mensaje ||

            error?.error?.message ||

            'No se pudo eliminar. Comprueba si el veterinario tiene citas asociadas.';

          this.notificacionesServicio.agregar(

            'No se pudo eliminar',

            this.mensajeError,

            'error'

          );

          this.cd.detectChanges();

        }

      });

  }


  // ========================================================
  // 27. CERRAR FORMULARIO
  // ========================================================

  cerrarFormulario(): void {

    if (this.guardando) {
      return;
    }

    this.mostrarFormulario = false;

    this.veterinarioEditandoId = null;

    this.veterinarioEditando = null;

    this.veterinarioForm.reset({

      usuarioId: null,

      cedula: '',

      especialidad: '',

      telefono: ''

    });

    this.cd.detectChanges();

  }


  // ========================================================
  // 28. IDENTIFICAR FILAS
  // ========================================================

  trackByVeterinario(
    index: number,
    veterinario: Veterinario
  ): number {

    return veterinario.id ?? index;

  }


  // ========================================================
  // 29. VOLVER AL DASHBOARD
  // ========================================================

  volverDashboard(): void {

    void this.router.navigate([
      '/admin/dashboard'
    ]);

  }

}
