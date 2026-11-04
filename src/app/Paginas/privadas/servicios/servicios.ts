
/* ==========================================================
   VETERINARIA AREVALO
   PÁGINA: SERVICIOS (USER)

   MEJORAS:
   - Consultar servicios desde Spring Boot.
   - Buscar por nombre o descripción.
   - Ordenar servicios por nombre o precio.
   - Mostrar precios en dólares.
   - Consultar nuevamente sin recargar la página.
   - Navegar al formulario de citas.
   - Enviar notificaciones globales.
   - Mantener el menú lateral compartido.
   ========================================================== */


// ==========================================================
// IMPORTACIONES DE ANGULAR
// ==========================================================

// Component permite crear la página.
// OnInit ejecuta funciones al cargar el componente.
// ChangeDetectorRef actualiza la vista al recibir datos.
import {
  Component,
  OnInit,
  ChangeDetectorRef
} from '@angular/core';

// CommonModule permite usar *ngIf, *ngFor y pipes.
import { CommonModule } from '@angular/common';

// FormsModule permite utilizar ngModel en los filtros.
import { FormsModule } from '@angular/forms';

// Router permite navegar entre páginas.
import { Router } from '@angular/router';


// ==========================================================
// SERVICIOS
// ==========================================================

// Servicio existente que consulta la API REST.
import { ServicioServicio }
  from '../../../Servicios/servicio-servicio';

// Servicio de notificaciones del menú global.
import { NotificacionesServicio }
  from '../../../Servicios/notificaciones-servicio';


// ==========================================================
// INTERFAZ DE LOS SERVICIOS
// ==========================================================

// Se utilizan los campos conocidos de tu API.
// No añadimos campos obligatorios nuevos.
interface ServicioVeterinario {

  id?: number;

  nombre: string;

  descripcion?: string | null;

  precio?: number | string | null;

}


// ==========================================================
// COMPONENTE SERVICIOS
// ==========================================================

@Component({

  selector: 'app-servicios',

  standalone: true,

  imports: [
    CommonModule,
    FormsModule
  ],

  templateUrl: './servicios.html',

  styleUrl: './servicios.scss'

})
export class Servicios implements OnInit {


  // ========================================================
  // LISTA DE SERVICIOS
  // ========================================================

  // Contiene los servicios recuperados de Spring Boot.
  servicios: ServicioVeterinario[] = [];


  // ========================================================
  // ESTADOS DE LA INTERFAZ
  // ========================================================

  // Indica que estamos consultando la API.
  cargando: boolean = false;

  // Permite diferenciar un error de una lista vacía.
  errorCarga: boolean = false;

  // Mensaje cuando ocurre un error.
  mensajeError: string = '';

  // Mensaje cuando se actualiza el catálogo manualmente.
  mensajeExito: string = '';


  // ========================================================
  // BUSCADOR Y ORDENAMIENTO
  // ========================================================

  // Texto que escribe el usuario.
  busqueda: string = '';

  // Opciones:
  // nombre, precioAsc, precioDesc.
  ordenarPor: string = 'nombre';


  // ========================================================
  // CONSTRUCTOR
  // ========================================================

  constructor(

    // Consulta GET /api/servicios.
    private servicioServicio: ServicioServicio,

    // Permite navegar al Dashboard o a Mis Citas.
    private router: Router,

    // Envía avisos al menú lateral compartido.
    private notificacionesServicio: NotificacionesServicio,

    // Actualiza la interfaz cuando llega la respuesta.
    private cd: ChangeDetectorRef

  ) {}


  // ========================================================
  // AL ABRIR LA PÁGINA
  // ========================================================

  ngOnInit(): void {

    // Consultamos los servicios disponibles.
    this.cargarServicios();

  }


  // ========================================================
  // NORMALIZAR TEXTO
  // ========================================================

  /*
    Permite buscar sin distinguir:
    - Mayúsculas y minúsculas.
    - Vocales con o sin tildes.

    Por ejemplo:
    "vacunacion" encuentra "Vacunación".
  */

  private normalizarTexto(
    valor: unknown
  ): string {

    return String(valor ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();

  }


  // ========================================================
  // OBTENER SERVICIOS FILTRADOS
  // ========================================================

  get serviciosFiltrados(): ServicioVeterinario[] {

    const textoBuscado =
      this.normalizarTexto(this.busqueda);


    // ======================================================
    // FILTRAR POR NOMBRE O DESCRIPCIÓN
    // ======================================================

    const resultado = this.servicios.filter(
      servicio => {

        const contenido = this.normalizarTexto(
          `${servicio.nombre ?? ''} ${servicio.descripcion ?? ''}`
        );

        return contenido.includes(textoBuscado);

      }
    );


    // ======================================================
    // ORDENAR LOS RESULTADOS
    // ======================================================

    return [...resultado].sort((a, b) => {

      // Orden alfabético.
      if (this.ordenarPor === 'nombre') {

        return String(a.nombre ?? '')
          .localeCompare(
            String(b.nombre ?? ''),
            'es',
            {
              sensitivity: 'base'
            }
          );

      }

      // Convertir los precios a números.
      const precioA = Number(a.precio);
      const precioB = Number(b.precio);

      // Enviamos al final los precios sin valor válido.
      const validoA =
        a.precio !== null &&
        a.precio !== undefined &&
        a.precio !== '' &&
        Number.isFinite(precioA);

      const validoB =
        b.precio !== null &&
        b.precio !== undefined &&
        b.precio !== '' &&
        Number.isFinite(precioB);

      if (!validoA && !validoB) {
        return 0;
      }

      if (!validoA) {
        return 1;
      }

      if (!validoB) {
        return -1;
      }

      // Orden de menor a mayor precio.
      if (this.ordenarPor === 'precioAsc') {
        return precioA - precioB;
      }

      // Orden de mayor a menor precio.
      if (this.ordenarPor === 'precioDesc') {
        return precioB - precioA;
      }

      return 0;

    });

  }


  // ========================================================
  // LIMPIAR LOS FILTROS
  // ========================================================

  limpiarFiltros(): void {

    this.busqueda = '';

    this.ordenarPor = 'nombre';

  }


  // ========================================================
  // COMPROBAR SI UN PRECIO ES VÁLIDO
  // ========================================================

  precioValido(
    precio: number | string | null | undefined
  ): boolean {

    return precio !== null &&
      precio !== undefined &&
      precio !== '' &&
      Number.isFinite(Number(precio));

  }


  // ========================================================
  // FORMATEAR PRECIOS
  // ========================================================

  obtenerPrecio(
    precio: number | string | null | undefined
  ): number {

    return Number(precio);

  }


  // ========================================================
  // CARGAR SERVICIOS DESDE SPRING BOOT
  // ========================================================

  cargarServicios(
    actualizacionManual: boolean = false
  ): void {

    // Evitar consultas duplicadas.
    if (this.cargando) {
      return;
    }

    // Estados de la consulta.
    this.cargando = true;

    this.errorCarga = false;

    this.mensajeError = '';

    this.mensajeExito = '';


    // ======================================================
    // GET /api/servicios
    // ======================================================

    // El interceptor agrega el JWT automáticamente,
    // obteniéndolo desde la sesión de esta pestaña.
    this.servicioServicio
      .listarServicios()
      .subscribe({


        // ==================================================
        // RESPUESTA CORRECTA
        // ==================================================

        next: (respuesta) => {

          // Verificamos que la API devuelva una lista.
          this.servicios = Array.isArray(respuesta)
            ? respuesta
            : [];

          // Finaliza la carga.
          this.cargando = false;

          this.errorCarga = false;


          // Mostrar mensaje solamente si el usuario
          // presionó el botón Actualizar.
          if (actualizacionManual) {

            this.mensajeExito =
              'El catálogo de servicios se actualizó correctamente.';

            // Aviso en la campana global.
            this.notificacionesServicio.agregar(
              'Servicios actualizados',
              'Se consultó nuevamente el catálogo veterinario.',
              'exito'
            );

          }

          this.cd.detectChanges();

        },


        // ==================================================
        // ERROR DE CONEXIÓN O CONSULTA
        // ==================================================

        error: (error) => {

          console.error(
            'Error al cargar los servicios:',
            error
          );

          this.cargando = false;

          this.errorCarga = true;

          this.mensajeError =
            'No se pudieron cargar los servicios. Comprueba tu conexión e intenta nuevamente.';


          // Notificar el error.
          this.notificacionesServicio.agregar(
            'Error al consultar servicios',
            'La información del catálogo no pudo recuperarse.',
            'error'
          );

          this.cd.detectChanges();

        }

      });

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
  // IR A MIS CITAS
  // ========================================================

  /*
    Esta función abre el módulo de citas.

    El USER selecciona allí el servicio,
    la mascota, el veterinario y la fecha.

    No modifica ni registra citas directamente.
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
