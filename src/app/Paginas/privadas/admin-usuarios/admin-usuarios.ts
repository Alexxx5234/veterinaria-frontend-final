
/* ==========================================================
   VETERINARIA AREVALO
   ADMINISTRACIÓN DE USUARIOS

   FUNCIONES:
   - Consultar todos los usuarios.
   - Consultar usuarios pendientes.
   - Buscar por nombre o correo.
   - Filtrar por estado.
   - Mostrar estadísticas generales.
   - Aprobar, rechazar, bloquear y activar cuentas.
   - Eliminar usuarios con confirmación.
   - Evitar solicitudes duplicadas.
   - Enviar avisos a las notificaciones globales.

   IMPORTANTE:
   Solo ADMIN puede acceder a este módulo.
   Los permisos también deben aplicarse en Spring Boot.
   ========================================================== */


// ==========================================================
// IMPORTACIONES ANGULAR
// ==========================================================

import {
  Component,
  OnInit,
  ChangeDetectorRef
} from '@angular/core';

import { CommonModule } from '@angular/common';

// Permite utilizar ngModel en el buscador y filtros.
import { FormsModule } from '@angular/forms';

// Navegación hacia el Dashboard.
import { Router } from '@angular/router';

// Permite consultar varios endpoints.
import {
  forkJoin,
  Observable,
  of
} from 'rxjs';


// ==========================================================
// SERVICIOS
// ==========================================================

// Servicio original de Administración de Usuarios.
import { AdminUsuarioServicio }
  from '../../../Servicios/admin-usuario-servicio';

// Servicio compartido con la campana de notificaciones.
import { NotificacionesServicio }
  from '../../../Servicios/notificaciones-servicio';


// ==========================================================
// ESTRUCTURA DE LOS USUARIOS
// ==========================================================

interface UsuarioAdmin {

  id: number;

  nombre: string;

  correo: string;

  rol: string;

  estado: string;

  activo: boolean;

  verificado: boolean;

}


// ==========================================================
// COMPONENTE
// ==========================================================

@Component({

  selector: 'app-admin-usuarios',

  standalone: true,

  imports: [
    CommonModule,
    FormsModule
  ],

  templateUrl: './admin-usuarios.html',

  styleUrl: './admin-usuarios.scss'

})
export class AdminUsuarios implements OnInit {


  // ========================================================
  // LISTAS DE USUARIOS
  // ========================================================

  // Usuarios que aparecen en la vista seleccionada.
  usuarios: UsuarioAdmin[] = [];

  // Lista completa para calcular las estadísticas.
  todosUsuarios: UsuarioAdmin[] = [];


  // ========================================================
  // VISTA ACTUAL
  // ========================================================

  // Conservamos las dos opciones originales:
  // Todos los usuarios y Usuarios pendientes.
  vistaActual: 'todos' | 'pendientes' = 'todos';


  // ========================================================
  // ESTADOS DE LA INTERFAZ
  // ========================================================

  cargando: boolean = false;

  errorCarga: boolean = false;

  mensajeError: string = '';

  mensajeExito: string = '';

  // Identifica al usuario sobre el que se ejecuta
  // una operación administrativa.
  accionEnCursoId: number | null = null;


  // ========================================================
  // BUSCADOR Y FILTRO POR ESTADO
  // ========================================================

  busqueda: string = '';

  filtroEstado: string = 'TODOS';


  // ========================================================
  // CONSTRUCTOR
  // ========================================================

  constructor(

    private adminUsuarioServicio: AdminUsuarioServicio,

    private notificacionesServicio: NotificacionesServicio,

    private router: Router,

    private cd: ChangeDetectorRef

  ) {}


  // ========================================================
  // AL ABRIR LA PÁGINA
  // ========================================================

  ngOnInit(): void {

    this.cargarUsuarios();

  }


  // ========================================================
  // NORMALIZAR TEXTO DE BÚSQUEDA
  // ========================================================

  // Permite buscar sin distinguir mayúsculas o tildes.
  private normalizarTexto(valor: unknown): string {

    return String(valor ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();

  }


  // ========================================================
  // CAMBIAR A TODOS LOS USUARIOS
  // ========================================================

  cargarUsuarios(): void {

    if (this.cargando || this.accionEnCursoId !== null) {
      return;
    }

    this.vistaActual = 'todos';

    this.limpiarFiltros();

    this.consultarVista();

  }


  // ========================================================
  // CAMBIAR A USUARIOS PENDIENTES
  // ========================================================

  cargarPendientes(): void {

    if (this.cargando || this.accionEnCursoId !== null) {
      return;
    }

    this.vistaActual = 'pendientes';

    this.limpiarFiltros();

    this.consultarVista();

  }


  // ========================================================
  // CONSULTAR LA VISTA ACTUAL
  // ========================================================

  private consultarVista(): void {

    this.cargando = true;

    this.errorCarga = false;

    this.mensajeError = '';


    // ======================================================
    // CONSULTAR LOS ENDPOINTS EXISTENTES
    // ======================================================

    // Siempre consultamos la lista completa
    // para mantener actualizadas las estadísticas.
    //
    // Si estamos en Pendientes, también consultamos:
    // GET /api/admin/usuarios-pendientes.
    //
    // No modificamos los servicios existentes.

    forkJoin({

      todos:
        this.adminUsuarioServicio.listarUsuarios(),

      pendientes:
        this.vistaActual === 'pendientes'
          ? this.adminUsuarioServicio.listarPendientes()
          : of(null)

    }).subscribe({


      // ====================================================
      // RESPUESTA CORRECTA
      // ====================================================

      next: (respuesta) => {

        this.todosUsuarios = Array.isArray(respuesta.todos)
          ? respuesta.todos
          : [];

        if (this.vistaActual === 'pendientes') {

          this.usuarios = Array.isArray(respuesta.pendientes)
            ? respuesta.pendientes
            : [];

        } else {

          this.usuarios = this.todosUsuarios;

        }

        this.cargando = false;

        this.errorCarga = false;

        this.cd.detectChanges();

      },


      // ====================================================
      // ERROR DE CONSULTA
      // ====================================================

      error: (error) => {

        console.error(
          'Error al consultar usuarios:',
          error
        );

        this.cargando = false;

        this.errorCarga = true;

        this.mensajeError =
          error?.status === 0
            ? 'No se pudo conectar con el servidor. Comprueba que Spring Boot esté funcionando.'
            : 'No se pudieron cargar los usuarios. Intenta nuevamente.';

        this.notificacionesServicio.agregar(
          'Error al consultar usuarios',
          'No se pudo recuperar la información del sistema.',
          'error'
        );

        this.cd.detectChanges();

      }

    });

  }


  // ========================================================
  // ACTUALIZAR LISTADO MANUALMENTE
  // ========================================================

  actualizarUsuarios(): void {

    if (this.cargando || this.accionEnCursoId !== null) {
      return;
    }

    this.consultarVista();

  }


  // ========================================================
  // ESTADÍSTICAS GENERALES
  // ========================================================

  get totalUsuarios(): number {

    return this.todosUsuarios.length;

  }


  get totalAprobados(): number {

    return this.todosUsuarios.filter(usuario =>
      usuario.estado === 'APROBADA'
    ).length;

  }


  get totalPendientes(): number {

    return this.todosUsuarios.filter(usuario =>
      usuario.estado === 'PENDIENTE'
    ).length;

  }


  get totalBloqueados(): number {

    return this.todosUsuarios.filter(usuario =>
      usuario.estado === 'BLOQUEADA'
    ).length;

  }


  // ========================================================
  // ESTADOS DISPONIBLES PARA EL FILTRO
  // ========================================================

  // Obtenemos los estados que realmente existen
  // en el listado actual, sin inventar valores.
  get estadosDisponibles(): string[] {

    return Array.from(
      new Set(
        this.usuarios
          .map(usuario => usuario.estado)
          .filter(estado => !!estado)
      )
    ).sort();

  }


  // ========================================================
  // FILTRAR USUARIOS
  // ========================================================

  get usuariosFiltrados(): UsuarioAdmin[] {

    const texto =
      this.normalizarTexto(this.busqueda);

    return this.usuarios.filter(usuario => {

      // Buscar por nombre o correo.
      const contenido = this.normalizarTexto(
        `${usuario.nombre} ${usuario.correo} ${usuario.id}`
      );

      const coincideBusqueda =
        contenido.includes(texto);

      // Filtrar por estado.
      const coincideEstado =
        this.filtroEstado === 'TODOS' ||
        usuario.estado === this.filtroEstado;

      return coincideBusqueda && coincideEstado;

    });

  }


  // ========================================================
  // LIMPIAR FILTROS
  // ========================================================

  limpiarFiltros(): void {

    this.busqueda = '';

    this.filtroEstado = 'TODOS';

  }


  // ========================================================
  // COMPROBAR SI ES ADMIN
  // ========================================================

  esAdmin(usuario: UsuarioAdmin): boolean {

    return usuario.rol === 'ADMIN';

  }


  // ========================================================
  // COMPROBAR SI HAY UNA OPERACIÓN EN CURSO
  // ========================================================

  get hayAccionEnCurso(): boolean {

    return this.accionEnCursoId !== null;

  }


  // ========================================================
  // MÉTODO COMPARTIDO DE ACCIONES
  // ========================================================

  /*
    Este método se utiliza para:

    - Aprobar.
    - Rechazar.
    - Bloquear.
    - Activar.
    - Eliminar.

    Así evitamos repetir la misma lógica
    de confirmación y manejo de errores.
  */

  private ejecutarAccion(

    usuario: UsuarioAdmin,

    pregunta: string,

    tituloNotificacion: string,

    mensajeCorrecto: string,

    peticion: Observable<any>

  ): void {


    // ======================================================
    // PROTEGER CUENTAS ADMIN
    // ======================================================

    // Evita ejecutar acciones desde la interfaz
    // sobre cuentas con rol ADMIN.
    if (this.esAdmin(usuario)) {
      return;
    }


    // ======================================================
    // EVITAR SOLICITUDES DUPLICADAS
    // ======================================================

    if (this.hayAccionEnCurso || this.cargando) {
      return;
    }


    // ======================================================
    // CONFIRMACIÓN DEL ADMINISTRADOR
    // ======================================================

    if (!window.confirm(pregunta)) {
      return;
    }


    // ======================================================
    // INICIAR LA OPERACIÓN
    // ======================================================

    this.accionEnCursoId = usuario.id;

    this.mensajeError = '';

    this.mensajeExito = '';


    // ======================================================
    // PETICIÓN AL BACKEND
    // ======================================================

    peticion.subscribe({


      // ====================================================
      // OPERACIÓN CORRECTA
      // ====================================================

      next: () => {

        this.accionEnCursoId = null;

        this.mensajeExito = mensajeCorrecto;


        // Enviar aviso a la campana superior.
        this.notificacionesServicio.agregar(
          tituloNotificacion,
          `${mensajeCorrecto} Usuario: ${usuario.nombre}.`,
          'exito'
        );


        // Actualizar la vista sin recargar toda la web.
        this.recargarVistaActual();

      },


      // ====================================================
      // ERROR DE OPERACIÓN
      // ====================================================

      error: (error) => {

        console.error(
          `Error administrativo sobre ${usuario.nombre}:`,
          error
        );

        this.accionEnCursoId = null;

        this.mensajeError =
          error?.error?.mensaje ||
          error?.error?.message ||
          'No se pudo completar la operación. Intenta nuevamente.';


        this.notificacionesServicio.agregar(
          'Operación no completada',
          `No fue posible realizar la acción sobre ${usuario.nombre}.`,
          'error'
        );

        this.cd.detectChanges();

      }

    });

  }


  // ========================================================
  // APROBAR USUARIO
  // ========================================================

  aprobarUsuario(usuario: UsuarioAdmin): void {

    if (usuario.estado !== 'PENDIENTE') {
      return;
    }

    this.ejecutarAccion(

      usuario,

      `¿Deseas aprobar al usuario ${usuario.nombre}?`,

      'Usuario aprobado',

      'Usuario aprobado correctamente.',

      this.adminUsuarioServicio.aprobarUsuario(usuario.id)

    );

  }


  // ========================================================
  // RECHAZAR USUARIO
  // ========================================================

  rechazarUsuario(usuario: UsuarioAdmin): void {

    if (usuario.estado !== 'PENDIENTE') {
      return;
    }

    this.ejecutarAccion(

      usuario,

      `¿Deseas rechazar la solicitud de ${usuario.nombre}?`,

      'Solicitud rechazada',

      'Usuario rechazado correctamente.',

      this.adminUsuarioServicio.rechazarUsuario(usuario.id)

    );

  }


  // ========================================================
  // BLOQUEAR USUARIO
  // ========================================================

  bloquearUsuario(usuario: UsuarioAdmin): void {

    if (
      usuario.estado !== 'APROBADA' ||
      !usuario.activo
    ) {
      return;
    }

    this.ejecutarAccion(

      usuario,

      `¿Deseas bloquear la cuenta de ${usuario.nombre}?`,

      'Usuario bloqueado',

      'Usuario bloqueado correctamente.',

      this.adminUsuarioServicio.bloquearUsuario(usuario.id)

    );

  }


  // ========================================================
  // ACTIVAR USUARIO
  // ========================================================

  activarUsuario(usuario: UsuarioAdmin): void {

    if (
      usuario.estado !== 'BLOQUEADA' &&
      usuario.activo
    ) {
      return;
    }

    this.ejecutarAccion(

      usuario,

      `¿Deseas activar nuevamente la cuenta de ${usuario.nombre}?`,

      'Usuario activado',

      'Usuario activado correctamente.',

      this.adminUsuarioServicio.activarUsuario(usuario.id)

    );

  }


  // ========================================================
  // ELIMINAR USUARIO
  // ========================================================

  eliminarUsuario(usuario: UsuarioAdmin): void {

    this.ejecutarAccion(

      usuario,

      `ATENCIÓN: ¿Estás seguro de eliminar permanentemente a ${usuario.nombre}? Esta acción no se puede deshacer.`,

      'Usuario eliminado',

      'Usuario eliminado correctamente.',

      this.adminUsuarioServicio.eliminarUsuario(usuario.id)

    );

  }


  // ========================================================
  // RECARGAR LA VISTA ACTUAL
  // ========================================================

  /*
    Conserva la pestaña seleccionada.

    Si el administrador estaba viendo Pendientes,
    seguirá en Pendientes después de aprobar.
  */

  recargarVistaActual(): void {

    this.consultarVista();

  }


  // ========================================================
  // IDENTIFICAR REGISTROS EN EL HTML
  // ========================================================

  trackByUsuario(
    index: number,
    usuario: UsuarioAdmin
  ): number {

    return usuario.id ?? index;

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
