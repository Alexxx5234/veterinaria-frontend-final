
/* ==========================================================
   VETERINARIA AREVALO
   PÁGINA: VETERINARIOS (USER)

   MEJORAS DE USABILIDAD:
   - Listado de profesionales desde Spring Boot.
   - Búsqueda por nombre, apellido o especialidad.
   - Filtro por especialidad.
   - Ordenamiento alfabético.
   - Mensajes de carga, error y lista vacía.
   - Notificaciones en el menú global.
   - Navegación al módulo Mis Citas.

   IMPORTANTE:
   El USER solamente consulta veterinarios.
   No puede crearlos, editarlos ni eliminarlos.
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

// Permite utilizar ngModel en filtros y buscador.
import { FormsModule } from '@angular/forms';

// Navegación entre módulos.
import { Router } from '@angular/router';


// ==========================================================
// SERVICIOS
// ==========================================================

// Servicio existente de la API REST.
import { VeterinarioServicio }
  from '../../../Servicios/veterinario-servicio';

// Servicio compartido de notificaciones.
import { NotificacionesServicio }
  from '../../../Servicios/notificaciones-servicio';


// ==========================================================
// INTERFAZ DEL VETERINARIO
// ==========================================================

// Representa los campos que utiliza la página.
// Los campos opcionales permiten mostrar registros
// aunque no toda la información esté disponible.
interface Veterinario {

  id?: number;

  nombre?: string | null;

  apellido?: string | null;

  cedula?: string | null;

  especialidad?: string | null;

  telefono?: string | null;

  email?: string | null;

}


// ==========================================================
// COMPONENTE VETERINARIOS
// ==========================================================

@Component({

  selector: 'app-veterinarios',

  standalone: true,

  imports: [
    CommonModule,
    FormsModule
  ],

  templateUrl: './veterinarios.html',

  styleUrl: './veterinarios.scss'

})
export class Veterinarios implements OnInit {


  // ========================================================
  // LISTA DE VETERINARIOS
  // ========================================================

  veterinarios: Veterinario[] = [];


  // ========================================================
  // ESTADOS DE LA INTERFAZ
  // ========================================================

  // Indica que estamos esperando una respuesta.
  cargando: boolean = false;

  // Diferencia un fallo de una lista vacía.
  errorCarga: boolean = false;

  // Mensaje cuando ocurre un error.
  mensajeError: string = '';

  // Mensaje de actualización manual.
  mensajeExito: string = '';


  // ========================================================
  // BÚSQUEDA Y FILTROS
  // ========================================================

  // Buscar por nombre, apellido y especialidad.
  busqueda: string = '';

  // Especialidad seleccionada.
  filtroEspecialidad: string = 'TODAS';

  // Orden del listado:
  // nombreAsc o nombreDesc.
  ordenarPor: string = 'nombreAsc';


  // ========================================================
  // CONSTRUCTOR
  // ========================================================

  constructor(

    private veterinarioServicio: VeterinarioServicio,

    private notificacionesServicio: NotificacionesServicio,

    private router: Router,

    private cd: ChangeDetectorRef

  ) {}


  // ========================================================
  // AL ABRIR LA PÁGINA
  // ========================================================

  ngOnInit(): void {

    this.cargarVeterinarios();

  }


  // ========================================================
  // NORMALIZAR TEXTO
  // ========================================================

  /*
    Permite buscar sin importar las mayúsculas
    ni las tildes.

    Ejemplo:
    "cirugia" también encuentra "Cirugía".
  */

  private normalizarTexto(
    valor: unknown
  ): string {

    return String(valor ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();

  }


  // ========================================================
  // OBTENER NOMBRE COMPLETO
  // ========================================================

  obtenerNombreCompleto(
    veterinario: Veterinario
  ): string {

    const nombre = String(
      veterinario.nombre ?? ''
    ).trim();

    const apellido = String(
      veterinario.apellido ?? ''
    ).trim();

    const completo =
      `${nombre} ${apellido}`.trim();

    return completo || 'Profesional veterinario';

  }


  // ========================================================
  // ESPECIALIDADES DISPONIBLES
  // ========================================================

  /*
    El filtro se llena automáticamente con
    las especialidades reales de la API.

    No utilizamos especialidades inventadas.
  */

  get especialidadesDisponibles(): string[] {

    const especialidades = this.veterinarios
      .map(veterinario =>
        String(veterinario.especialidad ?? '').trim()
      )
      .filter(especialidad =>
        especialidad.length > 0
      );

    return Array.from(
      new Set(especialidades)
    ).sort((a, b) =>
      a.localeCompare(b, 'es', {
        sensitivity: 'base'
      })
    );

  }


  // ========================================================
  // VETERINARIOS FILTRADOS
  // ========================================================

  get veterinariosFiltrados(): Veterinario[] {

    const textoBuscado =
      this.normalizarTexto(this.busqueda);

    const especialidadSeleccionada =
      this.normalizarTexto(this.filtroEspecialidad);


    // ======================================================
    // BÚSQUEDA POR TEXTO Y ESPECIALIDAD
    // ======================================================

    const resultado = this.veterinarios.filter(
      veterinario => {

        const contenido = this.normalizarTexto(
          [
            veterinario.nombre,
            veterinario.apellido,
            veterinario.especialidad
          ].join(' ')
        );

        const coincideBusqueda =
          contenido.includes(textoBuscado);

        const coincideEspecialidad =
          this.filtroEspecialidad === 'TODAS' ||
          this.normalizarTexto(
            veterinario.especialidad
          ) === especialidadSeleccionada;

        return coincideBusqueda &&
          coincideEspecialidad;

      }
    );


    // ======================================================
    // ORDENAR ALFABÉTICAMENTE
    // ======================================================

    return [...resultado].sort((a, b) => {

      const comparacion =
        this.obtenerNombreCompleto(a)
          .localeCompare(
            this.obtenerNombreCompleto(b),
            'es',
            {
              sensitivity: 'base'
            }
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
  // CONSULTAR VETERINARIOS DESDE SPRING BOOT
  // ========================================================

  cargarVeterinarios(
    actualizacionManual: boolean = false
  ): void {


    // Evitar varias consultas simultáneas.
    if (this.cargando) {
      return;
    }


    // Estados mientras consultamos.
    this.cargando = true;

    this.errorCarga = false;

    this.mensajeError = '';

    this.mensajeExito = '';


    // ======================================================
    // PETICIÓN GET /api/veterinarios
    // ======================================================

    // El interceptor JWT agrega el token de esta
    // pestaña, sin cambiar la sesión de ADMIN.
    this.veterinarioServicio
      .listarVeterinarios()
      .subscribe({


        // ==================================================
        // RESPUESTA CORRECTA
        // ==================================================

        next: (respuesta) => {

          // Comprobar que recibimos un arreglo.
          this.veterinarios =
            Array.isArray(respuesta)
              ? respuesta
              : [];

          this.cargando = false;

          this.errorCarga = false;


          // Mostrar confirmación únicamente cuando
          // el usuario solicita actualizar.
          if (actualizacionManual) {

            this.mensajeExito =
              'El listado de veterinarios se actualizó correctamente.';

            // Aviso en la campana compartida.
            this.notificacionesServicio.agregar(
              'Veterinarios actualizados',
              'Se consultó nuevamente el listado de profesionales.',
              'exito'
            );

          }

          this.cd.detectChanges();

        },


        // ==================================================
        // ERROR DE CONSULTA
        // ==================================================

        error: (error) => {

          console.error(
            'Error al cargar veterinarios:',
            error
          );

          this.cargando = false;

          this.errorCarga = true;


          if (error?.status === 0) {

            this.mensajeError =
              'No se pudo conectar con el servidor. Verifica que la API esté encendida.';

          } else {

            this.mensajeError =
              'No se pudieron cargar los veterinarios. Intenta nuevamente.';

          }


          // Informar el error en la campana.
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
  // IDENTIFICAR VETERINARIOS EN EL HTML
  // ========================================================

  trackByVeterinario(
    index: number,
    veterinario: Veterinario
  ): number {

    return veterinario.id ?? index;

  }


  // ========================================================
  // IR A MIS CITAS
  // ========================================================

  /*
    USER puede consultar a los veterinarios
    y luego agendar una cita.

    El formulario de Mis Citas permite elegir
    la mascota, el servicio y el profesional.
  */

  irCitas(): void {

    void this.router.navigate([
      '/usuario/citas'
    ]);

  }


  // ========================================================
  // VOLVER AL DASHBOARD USER
  // ========================================================

  volverDashboard(): void {

    void this.router.navigate([
      '/usuario/dashboard'
    ]);

  }

}
