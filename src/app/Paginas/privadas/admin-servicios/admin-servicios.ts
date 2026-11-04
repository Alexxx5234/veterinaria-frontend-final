
/* ==========================================================
   VETERINARIA AREVALO
   ADMINISTRACIÓN DE SERVICIOS (ADMIN)

   FUNCIONALIDADES:
   - Consultar todos los servicios veterinarios.
   - Mostrar el número total de servicios.
   - Buscar por nombre o descripción.
   - Ordenar por nombre o precio.
   - Crear nuevos servicios.
   - Editar servicios existentes.
   - Eliminar con confirmación.
   - Validar los datos del formulario.
   - Evitar solicitudes duplicadas.
   - Mostrar notificaciones en la campana global.

   IMPORTANTE:
   Solo ADMIN administra los servicios.
   Los permisos también se verifican en Spring Boot.
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

// Permite utilizar *ngIf, *ngFor y CurrencyPipe.
import { CommonModule } from '@angular/common';

// Formularios reactivos y controles de búsqueda.
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';

// Permite navegar al panel administrativo.
import { Router } from '@angular/router';

// Observable representa las peticiones HTTP.
import { Observable } from 'rxjs';


// ==========================================================
// SERVICIOS
// ==========================================================

// Servicio de la API REST.
import { ServicioServicio }
  from '../../../Servicios/servicio-servicio';

// Servicio compartido de notificaciones.
import { NotificacionesServicio }
  from '../../../Servicios/notificaciones-servicio';


// ==========================================================
// INTERFAZ DEL SERVICIO VETERINARIO
// ==========================================================

// Coincide con los campos utilizados de Servicio.java.
interface ServicioVeterinario {

  id: number;

  nombre: string;

  descripcion: string;

  precio: number | string;

}


// ==========================================================
// COMPONENTE ADMINISTRACIÓN DE SERVICIOS
// ==========================================================

@Component({

  selector: 'app-admin-servicios',

  standalone: true,

  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule
  ],

  templateUrl: './admin-servicios.html',

  styleUrl: './admin-servicios.scss'

})
export class AdminServicios implements OnInit {


  // ========================================================
  // LISTA DE SERVICIOS
  // ========================================================

  // Servicios obtenidos desde Spring Boot.
  servicios: ServicioVeterinario[] = [];


  // ========================================================
  // ESTADOS DE LA PÁGINA
  // ========================================================

  // Mientras se consulta GET /api/servicios.
  cargando: boolean = false;

  // Identifica cuando falla la consulta.
  errorCarga: boolean = false;

  // Mientras se crea o edita un servicio.
  guardando: boolean = false;

  // ID del servicio que se está eliminando.
  eliminandoId: number | null = null;

  // Mensajes visibles en la página.
  mensajeError: string = '';

  mensajeExito: string = '';


  // ========================================================
  // BÚSQUEDA Y ORDENAMIENTO
  // ========================================================

  busqueda: string = '';

  // Opciones:
  // nombreAsc, nombreDesc, precioAsc, precioDesc.
  ordenarPor: string = 'nombreAsc';


  // ========================================================
  // FORMULARIO
  // ========================================================

  mostrarFormulario: boolean = false;

  // null = crear un servicio.
  // número = editar un servicio existente.
  servicioEditandoId: number | null = null;

  servicioForm: FormGroup;

  // Referencia al input para enfocarlo al abrir el formulario.
  @ViewChild('campoNombre')
  campoNombre?: ElementRef<HTMLInputElement>;


  // ========================================================
  // CONSTRUCTOR
  // ========================================================

  constructor(

    private servicioServicio: ServicioServicio,

    private notificacionesServicio: NotificacionesServicio,

    private fb: FormBuilder,

    private router: Router,

    private cd: ChangeDetectorRef

  ) {

    // ======================================================
    // FORMULARIO REACTIVO
    // ======================================================

    // Conservamos los tres campos de Servicio.java.
    this.servicioForm = this.fb.group({

      nombre: [
        '',
        Validators.required
      ],

      descripcion: [
        '',
        Validators.required
      ],

      precio: [
        '',
        [
          Validators.required,
          Validators.min(0.01)
        ]
      ]

    });

  }


  // ========================================================
  // AL ABRIR EL MÓDULO
  // ========================================================

  ngOnInit(): void {

    this.cargarServicios();

  }


  // ========================================================
  // NORMALIZAR TEXTO
  // ========================================================

  /*
    Permite realizar búsquedas sin distinguir
    mayúsculas, minúsculas o tildes.

    Por ejemplo:
    "vacunacion" encontrará "Vacunación".
  */

  private normalizarTexto(valor: unknown): string {

    return String(valor ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();

  }


  // ========================================================
  // CONSULTAR SERVICIOS
  // ========================================================

  cargarServicios(
    actualizacionManual: boolean = false
  ): void {

    // Evitamos consultas y operaciones simultáneas.
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


    // ======================================================
    // GET /api/servicios
    // ======================================================

    // El interceptor agrega el JWT de ADMIN.
    this.servicioServicio
      .listarServicios()
      .subscribe({


        // ==================================================
        // RESPUESTA CORRECTA
        // ==================================================

        next: (respuesta) => {

          this.servicios = Array.isArray(respuesta)
            ? respuesta
            : [];

          this.cargando = false;

          this.errorCarga = false;


          // Notificar únicamente cuando el administrador
          // presiona el botón Actualizar.
          if (actualizacionManual) {

            this.mensajeExito =
              'El listado de servicios se actualizó correctamente.';

            this.notificacionesServicio.agregar(
              'Servicios actualizados',
              'El catálogo de servicios se consultó nuevamente.',
              'info'
            );

          }

          this.cd.detectChanges();

        },


        // ==================================================
        // ERROR DE CONSULTA
        // ==================================================

        error: (error) => {

          console.error(
            'Error al cargar servicios:',
            error
          );

          this.cargando = false;

          this.errorCarga = true;

          this.mensajeExito = '';

          this.mensajeError =
            error?.status === 0
              ? 'No se pudo conectar con Spring Boot. Verifica que la API esté encendida.'
              : 'No se pudieron cargar los servicios. Intenta nuevamente.';

          this.notificacionesServicio.agregar(
            'Error al consultar servicios',
            'No se pudo obtener el catálogo de servicios.',
            'error'
          );

          this.cd.detectChanges();

        }

      });

  }


  // ========================================================
  // TOTAL DE SERVICIOS
  // ========================================================

  /*
    Resumen sencillo:

    Solo mostramos el número total de servicios,
    sin estadísticas adicionales.
  */

  get totalServicios(): number {

    return this.servicios.length;

  }


  // ========================================================
  // FILTRAR Y ORDENAR SERVICIOS
  // ========================================================

  get serviciosFiltrados(): ServicioVeterinario[] {

    const textoBuscado =
      this.normalizarTexto(this.busqueda);


    // ======================================================
    // BUSCAR POR NOMBRE O DESCRIPCIÓN
    // ======================================================

    const resultado = this.servicios.filter(servicio => {

      const contenido = this.normalizarTexto(
        [
          servicio.nombre,
          servicio.descripcion
        ].join(' ')
      );

      return contenido.includes(textoBuscado);

    });


    // ======================================================
    // ORDENAMIENTO
    // ======================================================

    return [...resultado].sort((a, b) => {

      // Precio menor primero.
      if (this.ordenarPor === 'precioAsc') {

        return Number(a.precio) - Number(b.precio);

      }

      // Precio mayor primero.
      if (this.ordenarPor === 'precioDesc') {

        return Number(b.precio) - Number(a.precio);

      }

      // Orden alfabético por nombre.
      const comparacion = String(a.nombre ?? '')
        .localeCompare(
          String(b.nombre ?? ''),
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

    this.ordenarPor = 'nombreAsc';

  }


  // ========================================================
  // VALIDACIÓN VISUAL DE CAMPOS
  // ========================================================

  campoInvalido(nombre: string): boolean {

    const campo = this.servicioForm.get(nombre);

    return !!campo &&
      campo.invalid &&
      (campo.touched || campo.dirty);

  }


  // ========================================================
  // COMPROBAR OPERACIONES EN CURSO
  // ========================================================

  get hayOperacionEnCurso(): boolean {

    return (
      this.guardando ||
      this.eliminandoId !== null
    );

  }


  // ========================================================
  // ABRIR FORMULARIO PARA CREAR SERVICIO
  // ========================================================

  nuevoServicio(): void {

    if (this.cargando || this.hayOperacionEnCurso) {
      return;
    }

    // Sin ID: estamos creando.
    this.servicioEditandoId = null;

    // Limpiamos los valores del formulario.
    this.servicioForm.reset({

      nombre: '',
      descripcion: '',
      precio: ''

    });

    this.mensajeError = '';

    this.mensajeExito = '';

    this.mostrarFormulario = true;

    // Mostrar el formulario y enfocar el primer campo.
    this.cd.detectChanges();

    this.campoNombre?.nativeElement.focus();

  }


  // ========================================================
  // ABRIR FORMULARIO PARA EDITAR SERVICIO
  // ========================================================

  editarServicio(servicio: ServicioVeterinario): void {

    if (this.cargando || this.hayOperacionEnCurso) {
      return;
    }

    // Guardar el ID del servicio que editaremos.
    this.servicioEditandoId = servicio.id;

    // Recuperar los valores existentes.
    this.servicioForm.reset({

      nombre: servicio.nombre,

      descripcion: servicio.descripcion,

      precio: servicio.precio

    });

    this.mensajeError = '';

    this.mensajeExito = '';

    this.mostrarFormulario = true;

    this.cd.detectChanges();

    this.campoNombre?.nativeElement.focus();

  }


  // ========================================================
  // GUARDAR SERVICIO
  // ========================================================

  /*
    Este método realiza dos operaciones:

    CREAR:
    POST /api/servicios

    EDITAR:
    PUT /api/servicios/{id}
  */

  guardarServicio(): void {

    // Evitar guardar varias veces.
    if (this.cargando || this.hayOperacionEnCurso) {
      return;
    }

    this.mensajeError = '';


    // ======================================================
    // VALIDAR CAMPOS
    // ======================================================

    if (this.servicioForm.invalid) {

      this.servicioForm.markAllAsTouched();

      return;

    }

    const valores = this.servicioForm.getRawValue();

    // Limpiamos espacios innecesarios.
    const nombre =
      String(valores.nombre ?? '').trim();

    const descripcion =
      String(valores.descripcion ?? '').trim();

    const precio =
      Number(valores.precio);


    // No se aceptan nombres o descripciones vacíos.
    if (!nombre || !descripcion) {

      if (!nombre) {

        this.servicioForm.get('nombre')?.setErrors({
          required: true
        });

      }

      if (!descripcion) {

        this.servicioForm.get('descripcion')?.setErrors({
          required: true
        });

      }

      this.servicioForm.markAllAsTouched();

      return;

    }


    // Evitar valores de precio inválidos.
    if (!Number.isFinite(precio) || precio < 0.01) {

      this.servicioForm.get('precio')?.setErrors({
        min: true
      });

      this.servicioForm.get('precio')?.markAsTouched();

      return;

    }


    // ======================================================
    // JSON QUE RECIBE SPRING BOOT
    // ======================================================

    // Mantenemos los campos originales.
    const datosServicio = {

      nombre,

      descripcion,

      precio

    };


    // ======================================================
    // DECIDIR ENTRE CREAR O EDITAR
    // ======================================================

    const editando =
      this.servicioEditandoId !== null;

    const peticion: Observable<any> = editando

      ? this.servicioServicio.actualizarServicio(
          this.servicioEditandoId!,
          datosServicio
        )

      : this.servicioServicio.crearServicio(
          datosServicio
        );


    // Indicar que existe una petición en curso.
    this.guardando = true;

    this.mensajeExito = '';


    peticion.subscribe({


      // ====================================================
      // OPERACIÓN CORRECTA
      // ====================================================

      next: () => {

        this.guardando = false;

        // Cerramos el formulario.
        this.cerrarFormulario();

        this.mensajeExito = editando
          ? 'Servicio actualizado correctamente.'
          : 'Servicio creado correctamente.';


        // Enviar notificación a la campana.
        this.notificacionesServicio.agregar(

          editando
            ? 'Servicio actualizado'
            : 'Nuevo servicio registrado',

          `${this.mensajeExito} Nombre: ${nombre}.`,

          'exito'

        );


        // Consultar nuevamente los registros.
        this.cargarServicios();

        this.cd.detectChanges();

      },


      // ====================================================
      // ERROR AL GUARDAR
      // ====================================================

      error: (error) => {

        console.error(
          'Error al guardar servicio:',
          error
        );

        this.guardando = false;

        this.mensajeError =
          error?.error?.mensaje ||
          error?.error?.message ||
          'No se pudo guardar el servicio. Revisa los datos ingresados.';


        this.notificacionesServicio.agregar(
          'Error al guardar servicio',
          `No fue posible guardar el servicio ${nombre}.`,
          'error'
        );

        this.cd.detectChanges();

      }

    });

  }


  // ========================================================
  // ELIMINAR SERVICIO
  // ========================================================

  /*
    DELETE /api/servicios/{id}

    El usuario debe confirmar primero.
    La API decide si el servicio puede eliminarse,
    por ejemplo, si existen citas relacionadas.
  */

  eliminarServicio(servicio: ServicioVeterinario): void {

    if (this.cargando || this.hayOperacionEnCurso) {
      return;
    }


    // ======================================================
    // CONFIRMACIÓN
    // ======================================================

    const confirmado = window.confirm(

      `¿Estás seguro de eliminar permanentemente el servicio "${servicio.nombre}"? ` +
      'Esta acción no se puede deshacer.'

    );

    if (!confirmado) {
      return;
    }


    // ======================================================
    // PETICIÓN DELETE
    // ======================================================

    this.eliminandoId = servicio.id;

    this.mensajeError = '';

    this.mensajeExito = '';

    this.servicioServicio
      .eliminarServicio(servicio.id)
      .subscribe({


        // ==================================================
        // ELIMINACIÓN CORRECTA
        // ==================================================

        next: () => {

          this.eliminandoId = null;

          // Si se estaba editando el mismo servicio,
          // cerramos su formulario.
          if (this.servicioEditandoId === servicio.id) {

            this.cerrarFormulario();

          }

          this.mensajeExito =
            'Servicio eliminado correctamente.';

          this.notificacionesServicio.agregar(
            'Servicio eliminado',
            `El servicio ${servicio.nombre} fue eliminado.`,
            'exito'
          );

          this.cargarServicios();

        },


        // ==================================================
        // ERROR AL ELIMINAR
        // ==================================================

        error: (error) => {

          console.error(
            'Error al eliminar servicio:',
            error
          );

          this.eliminandoId = null;

          // Una cita asociada puede impedir el DELETE.
          this.mensajeError =
            error?.error?.mensaje ||
            error?.error?.message ||
            (
              error?.status === 409
                ? 'No se puede eliminar el servicio porque tiene registros relacionados.'
                : 'No se pudo eliminar el servicio.'
            );

          this.notificacionesServicio.agregar(
            'Error al eliminar servicio',
            `No se pudo eliminar el servicio ${servicio.nombre}.`,
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

    // No permitir cerrar mientras se envían datos.
    if (this.guardando) {
      return;
    }

    this.mostrarFormulario = false;

    this.servicioEditandoId = null;

    this.servicioForm.reset();

    this.cd.detectChanges();

  }


  // ========================================================
  // IDENTIFICAR SERVICIOS EN EL HTML
  // ========================================================

  trackByServicio(
    index: number,
    servicio: ServicioVeterinario
  ): number {

    return servicio.id ?? index;

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
