import { environment } from '../../../../environments/environment';

/* ==========================================================
   VETERINARIA ARÉVALO
   MÓDULO: MIS ATENCIONES MÉDICAS
   ROL: USER

   FUNCIONALIDADES:
   1. Consultar las mascotas del usuario autenticado.
   2. Consultar el historial médico de cada mascota.
   3. Buscar atenciones por nombre, diagnóstico o veterinario.
   4. Filtrar por mascota.
   5. Filtrar por rango de fechas.
   6. Consultar diagnósticos y tratamientos.
   7. Consultar observaciones médicas.
   8. Consultar medicamentos descriptivos de la atención.
   9. Mostrar estados de carga y mensajes de error.
   10. Evitar solicitudes duplicadas.

   SEGURIDAD:
   - El usuario solo consulta información.
   - No puede registrar ni modificar atenciones.
   - No puede administrar medicamentos.
   - Spring Boot valida la propiedad de cada mascota.

   IMPORTANTE:
   La carga finaliza únicamente después de consultar
   todos los historiales clínicos solicitados.
========================================================== */

// ==========================================================
// 1. IMPORTACIONES DE ANGULAR
// ==========================================================

import {
  Component,
  OnInit,
  ChangeDetectorRef
} from '@angular/core';

import { CommonModule } from '@angular/common';

import { FormsModule } from '@angular/forms';

import { RouterLink } from '@angular/router';

import {
  HttpClient,
  HttpHeaders
} from '@angular/common/http';


// ==========================================================
// 2. HERRAMIENTAS RXJS
// ==========================================================

import {
  forkJoin,
  of,
  catchError,
  map,
  finalize,
  timeout
} from 'rxjs';


// ==========================================================
// 3. SERVICIOS DEL PROYECTO
// ==========================================================

import {
  AuthServicio
} from '../../../Servicios/auth-servicio';

import {
  MascotaServicio
} from '../../../Servicios/mascota-servicio';


// ==========================================================
// 4. INTERFAZ DE MASCOTA
// ==========================================================

interface MascotaCliente {

  id: number;

  nombre: string;

}


// ==========================================================
// 5. INTERFAZ DE ATENCIÓN MÉDICA
// ==========================================================
//
// Coincide con el DTO AtencionMedicaRespuesta
// del backend Spring Boot.
//
// No incluye datos privados de otros propietarios.
// ==========================================================

interface AtencionCliente {

  id: number;

  citaId: number;

  mascotaId: number;

  nombreMascota: string;

  veterinarioId: number;

  nombreVeterinario: string;

  diagnostico: string;

  tratamiento: string;

  observaciones: string | null;

  medicamentosUtilizados: string | null;

  medicamentosRecetados: string | null;

  fechaAtencion: string;

}


// ==========================================================
// 6. RESULTADO DE CONSULTA DE HISTORIAL
// ==========================================================
//
// Permite diferenciar una consulta exitosa
// de una consulta que produjo un error.
// ==========================================================

interface ResultadoHistorial {

  atenciones: AtencionCliente[];

  error: boolean;

}


// ==========================================================
// 7. COMPONENTE PRINCIPAL
// ==========================================================

@Component({

  selector: 'app-atenciones-usuario',

  standalone: true,

  imports: [
    CommonModule,
    FormsModule,
    RouterLink
  ],

  templateUrl: './atenciones-usuario.html',

  styleUrl: './atenciones-usuario.scss'

})

export class AtencionesUsuario implements OnInit {


  // ========================================================
  // 8. CONFIGURACIÓN DE LA API
  // ========================================================

  // Se conserva la dirección actual de Spring Boot.

  private readonly apiUrl =
    environment.apiUrl;

  // Tiempo máximo para cada petición HTTP.

  private readonly tiempoMaximo = 20000;


  // ========================================================
  // 9. LISTAS DEL USUARIO
  // ========================================================

  mascotas: MascotaCliente[] = [];

  atenciones: AtencionCliente[] = [];


  // ========================================================
  // 10. ESTADOS DE LA PÁGINA
  // ========================================================

  // Indica que todavía se están consultando los datos.

  cargando = false;

  // Error general de la consulta.

  error = '';

  // Aviso cuando falla el historial de alguna mascota.

  advertencia = '';


  // ========================================================
  // 11. BUSCADOR Y FILTROS
  // ========================================================

  busqueda = '';

  mascotaSeleccionada = 0;

  desde = '';

  hasta = '';


  // ========================================================
  // 12. DETALLE DE ATENCIONES
  // ========================================================

  // Almacena el ID del detalle que se encuentra abierto.

  detalleId: number | null = null;


  // ========================================================
  // 13. CONSTRUCTOR
  // ========================================================

  constructor(

    private http: HttpClient,

    private auth: AuthServicio,

    private mascotaServicio: MascotaServicio,

    private cd: ChangeDetectorRef

  ) {}


  // ========================================================
  // 14. INICIALIZACIÓN
  // ========================================================

  ngOnInit(): void {

    this.cargarAtenciones();

  }


  // ========================================================
  // 15. OBTENER ENCABEZADOS JWT
  // ========================================================
  //
  // Utilizamos el token de la sesión actual.
  //
  // El backend identifica al propietario mediante
  // la autenticación, nunca por un ID enviado
  // libremente desde el frontend.
  // ========================================================

  private headers(): HttpHeaders {

    const token = this.auth.obtenerToken();

    return token

      ? new HttpHeaders({
          Authorization: `Bearer ${token}`
        })

      : new HttpHeaders();

  }


  // ========================================================
  // 16. CARGAR MASCOTAS Y SUS HISTORIALES
  // ========================================================
  //
  // PRIMERA CONSULTA:
  // Obtener las mascotas del usuario.
  //
  // SEGUNDA CONSULTA:
  // Obtener el historial de cada mascota.
  //
  // IMPORTANTE:
  // No desactivamos cargando al terminar
  // solamente la primera consulta.
  // ========================================================

  cargarAtenciones(): void {

    // Evitar múltiples peticiones simultáneas.

    if (this.cargando) {
      return;
    }

    // Activar pantalla de carga.

    this.cargando = true;

    // Limpiar los mensajes anteriores.

    this.error = '';

    this.advertencia = '';

    // Cerrar el detalle anterior.

    this.detalleId = null;


    // ======================================================
    // PASO 1. OBTENER MASCOTAS DEL USUARIO
    // ======================================================

    this.mascotaServicio
      .listarMisMascotas()
      .pipe(

        timeout(this.tiempoMaximo)

      )
      .subscribe({

        next: respuesta => {

          // Validar que el backend devuelva una lista.

          if (!Array.isArray(respuesta)) {

            this.mascotas = [];

            this.atenciones = [];

            this.error =
              'El servidor no devolvió una lista válida de mascotas.';

            // Finalizar carga porque no se puede continuar.

            this.cargando = false;

            this.cd.detectChanges();

            return;

          }


          // ==================================================
          // PASO 2. PREPARAR MASCOTAS
          // ==================================================

          this.mascotas = respuesta

            .filter(mascota =>

              mascota != null &&

              Number(mascota.id) > 0

            )

            .map(mascota => ({

              id: Number(mascota.id),

              nombre: String(
                mascota.nombre ?? 'Mascota'
              )

            }));


          // ==================================================
          // PASO 3. CONSULTAR HISTORIALES
          // ==================================================
          //
          // Aquí continuamos cargando.
          //
          // No cambiamos cargando a false todavía.
          // ==================================================

          this.consultarHistoriales();

        },


        error: error => {

          console.error(
            'Error al consultar mascotas:',
            error
          );

          this.mascotas = [];

          this.atenciones = [];


          // Mensaje según el error recibido.

          if (error?.status === 401) {

            this.error =
              'Tu sesión ha expirado. Inicia sesión nuevamente.';

          } else if (error?.status === 403) {

            this.error =
              'No tienes permiso para consultar tus mascotas.';

          } else {

            this.error =
              'No se pudieron consultar tus mascotas. Comprueba la conexión con el servidor.';

          }


          // Finalizar carga porque la petición falló.

          this.cargando = false;

          this.cd.detectChanges();

        }

      });

  }


  // ========================================================
  // 17. CONSULTAR HISTORIALES DE CADA MASCOTA
  // ========================================================
  //
  // Endpoint:
  //
  // GET /api/atenciones-medicas/mascota/{id}/historial
  //
  // Solo consultamos IDs obtenidos de las mascotas
  // pertenecientes al usuario autenticado.
  //
  // El backend también valida la autorización.
  // ========================================================

  private consultarHistoriales(): void {


    // ======================================================
    // CASO 1. EL USUARIO NO TIENE MASCOTAS
    // ======================================================

    if (this.mascotas.length === 0) {

      this.atenciones = [];

      this.cargando = false;

      this.cd.detectChanges();

      return;

    }


    // ======================================================
    // CASO 2. EL USUARIO TIENE MASCOTAS
    // ======================================================
    //
    // Crear una petición para cada mascota.
    //
    // Cada petición incluye el token JWT.
    // ======================================================

    const peticiones = this.mascotas.map(

      mascota =>

        this.http.get<AtencionCliente[]>(

          `${this.apiUrl}/atenciones-medicas/mascota/${mascota.id}/historial`,

          {
            headers: this.headers()
          }

        ).pipe(

          // Tiempo máximo por petición.

          timeout(this.tiempoMaximo),


          // Convertir una respuesta exitosa.

          map((respuesta): ResultadoHistorial => ({

            atenciones: Array.isArray(respuesta)
              ? respuesta
              : [],

            error: !Array.isArray(respuesta)

          })),


          // Una mascota puede fallar sin impedir
          // que se consulten las demás.

          catchError(error => {

            console.error(
              `Error al consultar el historial de la mascota ${mascota.id}:`,
              error
            );

            return of<ResultadoHistorial>({

              atenciones: [],

              error: true

            });

          })

        )

    );


    // ======================================================
    // PASO 3. EJECUTAR TODAS LAS PETICIONES
    // ======================================================
    //
    // forkJoin espera a que terminen todas las consultas.
    //
    // finalize desactiva cargando cuando terminan
    // correctamente o cuando ocurre un error general.
    // ======================================================

    forkJoin(peticiones)

      .pipe(

        finalize(() => {

          this.cargando = false;

          this.cd.detectChanges();

        })

      )

      .subscribe({

        next: resultados => {


          // ==================================================
          // UNIFICAR TODOS LOS HISTORIALES
          // ==================================================

          this.atenciones = resultados

            .flatMap(resultado => resultado.atenciones)

            .sort((a, b) =>

              String(
                b.fechaAtencion ?? ''
              ).localeCompare(

                String(
                  a.fechaAtencion ?? ''
                )

              )

            );


          // ==================================================
          // COMPROBAR SI ALGUNA CONSULTA FALLÓ
          // ==================================================

          const existenErrores = resultados.some(

            resultado => resultado.error

          );


          if (existenErrores) {

            this.advertencia =
              'No se pudo consultar el historial de alguna mascota. Puedes intentar actualizar nuevamente.';

          }


          // Actualizar la vista con las atenciones.

          this.cd.detectChanges();

        },


        error: error => {

          console.error(
            'Error general al consultar historiales:',
            error
          );

          this.atenciones = [];

          this.error =
            'No se pudo consultar el historial médico. Intenta nuevamente.';

          this.cd.detectChanges();

        }

      });

  }


  // ========================================================
  // 18. NORMALIZAR TEXTOS
  // ========================================================
  //
  // Permite buscar sin distinguir:
  // - Mayúsculas.
  // - Minúsculas.
  // - Tildes.
  //
  // No modifica el contenido de PostgreSQL.
  // ========================================================

  private normalizar(valor: unknown): string {

    return String(valor ?? '')

      .normalize('NFD')

      .replace(/[\u0300-\u036f]/g, '')

      .toLowerCase()

      .trim();

  }


  // ========================================================
  // 19. BUSCAR Y FILTRAR ATENCIONES
  // ========================================================
  //
  // Primero buscamos por texto.
  // Después filtramos por mascota y fechas.
  //
  // No se realizan nuevas peticiones HTTP
  // cada vez que el usuario cambia un filtro.
  // ========================================================

  get atencionesFiltradas(): AtencionCliente[] {

    const termino =
      this.normalizar(this.busqueda);


    return this.atenciones.filter(

      atencion => {


        // ==================================================
        // BUSCADOR
        // ==================================================

        const texto = this.normalizar([

          atencion.nombreMascota,

          atencion.nombreVeterinario,

          atencion.diagnostico,

          atencion.tratamiento,

          atencion.observaciones

        ].join(' '));


        const coincideBusqueda =

          !termino ||

          texto.includes(termino);


        // ==================================================
        // FILTRO DE MASCOTA
        // ==================================================

        const coincideMascota =

          this.mascotaSeleccionada === 0 ||

          atencion.mascotaId ===
            this.mascotaSeleccionada;


        // ==================================================
        // FILTRO DE FECHAS
        // ==================================================

        const fecha = String(

          atencion.fechaAtencion ?? ''

        ).substring(0, 10);


        const coincideDesde =

          !this.desde ||

          fecha >= this.desde;


        const coincideHasta =

          !this.hasta ||

          fecha <= this.hasta;


        return (

          coincideBusqueda &&

          coincideMascota &&

          coincideDesde &&

          coincideHasta

        );

      }

    );

  }


  // ========================================================
  // 20. ABRIR O CERRAR DETALLE CLÍNICO
  // ========================================================

  cambiarDetalle(id: number): void {

    if (this.detalleId === id) {

      this.detalleId = null;

    } else {

      this.detalleId = id;

    }

  }


  // ========================================================
  // 21. LIMPIAR FILTROS
  // ========================================================

  limpiarFiltros(): void {

    this.busqueda = '';

    this.mascotaSeleccionada = 0;

    this.desde = '';

    this.hasta = '';

  }


  // ========================================================
  // 22. IDENTIFICAR ATENCIONES
  // ========================================================
  //
  // Mejora la actualización de las tarjetas Angular
  // sin perder la identidad de sus elementos.
  // ========================================================

  identificarAtencion(

    _index: number,

    atencion: AtencionCliente

  ): number {

    return atencion.id;

  }

}
