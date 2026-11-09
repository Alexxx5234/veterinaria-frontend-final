import { environment } from '../../../../environments/environment';

/* ==========================================================
   VETERINARIA ARÉVALO
   MÓDULO: MIS CITAS DEL VETERINARIO

   FUNCIONALIDADES:
   1. Consultar citas asignadas al veterinario.
   2. Mostrar estadísticas reales.
   3. Buscar citas por mascota, dueño o servicio.
   4. Filtrar citas por estado.
   5. Aceptar citas pendientes.
   6. Rechazar citas pendientes.
   7. Confirmar las acciones antes de ejecutarlas.
   8. Mostrar mensajes de éxito y error.
   9. Conservar la autenticación JWT.
   10. Funcionar en computadoras y celulares.

   IMPORTANTE:
   No completamos directamente las citas.

   El backend cambia automáticamente una cita a
   COMPLETADA cuando se registra la atención médica.
   ========================================================== */


// ==========================================================
// 1. IMPORTACIONES DE ANGULAR
// ==========================================================

import {
  Component,
  OnInit,
  ChangeDetectorRef,
  HostListener
} from '@angular/core';


// Permite utilizar *ngIf, *ngFor y ngClass.
import {
  CommonModule
} from '@angular/common';


// Permite utilizar [(ngModel)] para búsqueda y filtros.
import {
  FormsModule
} from '@angular/forms';


// Permite consumir la API REST con JWT.
import {
  HttpClient,
  HttpHeaders
} from '@angular/common/http';


// Servicio de autenticación existente.
import {
  AuthServicio
} from '../../../Servicios/auth-servicio';


// ==========================================================
// 2. INTERFAZ DE LAS CITAS
// ==========================================================

/*
  Define los datos que esperamos recibir de Spring Boot.

  Algunos campos son opcionales porque pueden
  no estar presentes en todas las respuestas.
*/

interface CitaVeterinario {

  id: number;

  fechaHora?: string;

  estado?: string;

  motivo?: string;

  mascota?: {

    nombre?: string;

    especie?: string;

    raza?: string;

    usuario?: {
      nombre?: string;
    };

  };

  servicio?: {
    nombre?: string;
  };

  veterinario?: {
    nombre?: string;
  };

}


// ==========================================================
// 3. ACCIONES PERMITIDAS
// ==========================================================

/*
  Solo utilizaremos dos acciones:

  aceptar:
  PENDIENTE -> CONFIRMADA

  rechazar:
  PENDIENTE -> CANCELADA
*/

type AccionCita =
  | 'aceptar'
  | 'rechazar';


// ==========================================================
// 4. COMPONENTE ANGULAR
// ==========================================================

@Component({

  selector: 'app-citas-veterinario',

  standalone: true,

  imports: [
    CommonModule,
    FormsModule
  ],

  templateUrl: './citas-veterinario.html',

  styleUrl: './citas-veterinario.scss'

})
export class CitasVeterinario implements OnInit {


  // ========================================================
  // 5. DIRECCIÓN DE LA API REST
  // ========================================================

  /*
    Conservamos la dirección de Tailscale
    utilizada actualmente por tu sistema.

    No modificamos los endpoints del backend.
  */

  private readonly apiUrl =
    environment.apiUrl;


  // ========================================================
  // 6. LISTA DE CITAS
  // ========================================================

  // Contendrá solamente las citas asignadas.
  citas: CitaVeterinario[] = [];


  // ========================================================
  // 7. VARIABLES DE LA INTERFAZ
  // ========================================================

  // Indica si se están consultando las citas.
  cargando: boolean = false;

  // Guarda el ID de la cita que se está modificando.
  procesandoId: number | null = null;

  // Mensajes visibles al usuario.
  mensajeError: string = '';

  mensajeExito: string = '';


  // ========================================================
  // 8. FILTROS
  // ========================================================

  // Texto escrito en el buscador.
  busqueda: string = '';

  // Estado seleccionado.
  filtroEstado: string = 'TODAS';


  // ========================================================
  // 9. CONFIRMACIÓN DE ACCIONES
  // ========================================================

  /*
    Al aceptar o rechazar una cita, primero
    mostramos una ventana de confirmación.

    No enviamos la petición hasta que el
    veterinario confirme la operación.
  */

  accionPendiente: {
    cita: CitaVeterinario;
    tipo: AccionCita;
  } | null = null;


  // ========================================================
  // 10. CONSTRUCTOR
  // ========================================================

  constructor(

    private http: HttpClient,

    private authServicio: AuthServicio,

    private cd: ChangeDetectorRef

  ) {}


  // ========================================================
  // 11. INICIAR EL COMPONENTE
  // ========================================================

  ngOnInit(): void {

    // Consultar las citas al abrir la página.
    this.cargarCitas();

  }


  // ========================================================
  // 12. PREPARAR ENCABEZADOS JWT
  // ========================================================

  /*
    Utilizamos el token de la pestaña actual.

    Esto permite que ADMIN, USER y VETERINARIO
    mantengan sesiones independientes.

    No necesitamos enviar manualmente el ID
    del veterinario porque Spring Boot obtiene
    su identidad desde el JWT.
  */

  private obtenerHeaders(): HttpHeaders {

    const token =
      this.authServicio.obtenerToken();

    if (token) {

      return new HttpHeaders({
        Authorization: `Bearer ${token}`
      });

    }

    return new HttpHeaders();

  }


  // ========================================================
  // 13. CARGAR LAS CITAS ASIGNADAS
  // ========================================================

  cargarCitas(): void {

    // Evitar peticiones simultáneas.
    if (
      this.cargando ||
      this.procesandoId !== null
    ) {
      return;
    }

    // Activar indicador de carga.
    this.cargando = true;

    // Limpiar errores anteriores.
    this.mensajeError = '';


    // ======================================================
    // CONSULTAR SPRING BOOT
    // ======================================================

    /*
      Endpoint:

      GET /api/citas/mis-citas-veterinario

      Solo devuelve las citas relacionadas
      con el veterinario autenticado.
    */

    this.http.get<CitaVeterinario[]>(

      `${this.apiUrl}/citas/mis-citas-veterinario`,

      {
        headers: this.obtenerHeaders()
      }

    ).subscribe({


      // ====================================================
      // RESPUESTA CORRECTA
      // ====================================================

      next: (datos) => {

        // Comprobar que Spring Boot devolvió una lista.
        if (Array.isArray(datos)) {

          // Ordenar las citas por fecha.
          this.citas = [...datos].sort((a, b) => {

            const fechaA =
              a.fechaHora ?? '';

            const fechaB =
              b.fechaHora ?? '';

            return fechaA.localeCompare(fechaB);

          });

        } else {

          this.citas = [];

        }

        // Finalizar carga.
        this.cargando = false;

        // Actualizar los datos visibles.
        this.cd.detectChanges();

      },


      // ====================================================
      // ERROR DE CONSULTA
      // ====================================================

      error: (error) => {

        this.cargando = false;

        this.mensajeError =
          this.obtenerMensajeError(
            error,
            'No se pudieron cargar tus citas asignadas.'
          );

        this.cd.detectChanges();

      }

    });

  }


  // ========================================================
  // 14. ESTADÍSTICAS REALES
  // ========================================================

  /*
    Los contadores se calculan a partir de
    las citas recibidas desde Spring Boot.

    No utilizamos datos inventados.
  */


  // Total de citas asignadas.
  get totalCitas(): number {

    return this.citas.length;

  }


  // Citas pendientes de aprobación.
  get totalPendientes(): number {

    return this.citas.filter(
      cita => this.estado(cita) === 'PENDIENTE'
    ).length;

  }


  // Citas confirmadas.
  get totalConfirmadas(): number {

    return this.citas.filter(
      cita => this.estado(cita) === 'CONFIRMADA'
    ).length;

  }


  // Citas completadas.
  get totalCompletadas(): number {

    return this.citas.filter(
      cita => this.estado(cita) === 'COMPLETADA'
    ).length;

  }


  // ========================================================
  // 15. BUSCAR Y FILTRAR CITAS
  // ========================================================

  /*
    La búsqueda se realiza en Angular.

    No modifica los registros del backend.

    Permite buscar por:
    - Nombre de mascota.
    - Especie.
    - Propietario.
    - Servicio.
    - Motivo.
    - Fecha.
    - Número de cita.
  */

  get citasFiltradas(): CitaVeterinario[] {

    const texto =
      this.busqueda
        .toLocaleLowerCase('es')
        .trim();


    return this.citas.filter(cita => {


      // ====================================================
      // FILTRAR POR ESTADO
      // ====================================================

      if (
        this.filtroEstado !== 'TODAS' &&
        this.estado(cita) !== this.filtroEstado
      ) {

        return false;

      }


      // Si no hay texto, mostrar todas las
      // citas del estado seleccionado.
      if (!texto) {

        return true;

      }


      // ====================================================
      // CONSTRUIR EL TEXTO DE BÚSQUEDA
      // ====================================================

      const contenido = [

        cita.mascota?.nombre,

        cita.mascota?.especie,

        cita.mascota?.usuario?.nombre,

        cita.servicio?.nombre,

        cita.motivo,

        cita.fechaHora,

        String(cita.id)

      ]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase('es');


      // Verificar si coincide con la búsqueda.
      return contenido.includes(texto);

    });

  }


  // ========================================================
  // 16. NORMALIZAR ESTADO DE UNA CITA
  // ========================================================

  /*
    Convertimos el estado a mayúsculas
    para comparar siempre correctamente.
  */

  estado(cita: CitaVeterinario): string {

    return (
      cita.estado ?? ''
    ).toUpperCase();

  }


  // ========================================================
  // 17. COMPROBAR SI UNA CITA SE PUEDE MODIFICAR
  // ========================================================

  /*
    Solamente las citas PENDIENTES
    pueden aceptarse o rechazarse.

    También evitamos acciones repetidas
    mientras otra solicitud está activa.
  */

  puedeResolver(
    cita: CitaVeterinario
  ): boolean {

    return (

      this.estado(cita) === 'PENDIENTE' &&

      Number.isFinite(cita.id) &&

      this.procesandoId === null &&

      !this.cargando

    );

  }


  // ========================================================
  // 18. ABRIR VENTANA DE CONFIRMACIÓN
  // ========================================================

  solicitarAccion(

    cita: CitaVeterinario,

    tipo: AccionCita

  ): void {

    // No permitir modificar citas no pendientes.
    if (!this.puedeResolver(cita)) {
      return;
    }

    // Limpiar mensajes.
    this.mensajeError = '';

    this.mensajeExito = '';


    // Guardar la acción que necesita confirmación.
    this.accionPendiente = {

      cita,

      tipo

    };

  }


  // ========================================================
  // 19. CANCELAR LA CONFIRMACIÓN
  // ========================================================

  cancelarConfirmacion(): void {

    // No cerrar mientras se guarda una operación.
    if (this.procesandoId !== null) {
      return;
    }

    this.accionPendiente = null;

  }


  // ========================================================
  // 20. CERRAR VENTANA CON ESCAPE
  // ========================================================

  @HostListener('document:keydown.escape')
  cerrarConEscape(): void {

    this.cancelarConfirmacion();

  }


  // ========================================================
  // 21. CONFIRMAR ACEPTACIÓN O RECHAZO
  // ========================================================

  confirmarAccion(): void {

    const accion =
      this.accionPendiente;


    // Verificar que exista una acción pendiente.
    if (!accion) {
      return;
    }


    // Verificar nuevamente el estado.
    if (!this.puedeResolver(accion.cita)) {
      return;
    }


    // Obtener la cita y el tipo de operación.
    const { cita, tipo } = accion;


    // Activar estado de procesamiento.
    this.procesandoId = cita.id;

    this.mensajeError = '';


    // ======================================================
    // ENVIAR LA OPERACIÓN A SPRING BOOT
    // ======================================================

    /*
      ACEPTAR:

      PUT /api/citas/{id}/aceptar

      RECHAZAR:

      PUT /api/citas/{id}/rechazar

      El backend comprueba:
      - JWT válido.
      - Rol VETERINARIO.
      - Que la cita pertenezca al veterinario.
      - Que la cita se encuentre PENDIENTE.
    */

    this.http.put(

      `${this.apiUrl}/citas/${cita.id}/${tipo}`,

      {},

      {
        headers: this.obtenerHeaders()
      }

    ).subscribe({


      // ====================================================
      // OPERACIÓN CORRECTA
      // ====================================================

      next: () => {

        // Finalizar procesamiento.
        this.procesandoId = null;

        // Cerrar ventana.
        this.accionPendiente = null;


        // Mostrar mensaje de confirmación.
        if (tipo === 'aceptar') {

          this.mensajeExito =
            'La cita fue aceptada correctamente. Su nuevo estado es CONFIRMADA.';

        } else {

          this.mensajeExito =
            'La cita fue rechazada correctamente. Su nuevo estado es CANCELADA.';

        }


        // Volver a consultar Spring Boot.
        // Así mostramos el estado real de la cita.
        this.cargarCitas();

        this.cd.detectChanges();

      },


      // ====================================================
      // ERROR AL MODIFICAR LA CITA
      // ====================================================

      error: (error) => {

        this.procesandoId = null;

        this.accionPendiente = null;


        this.mensajeError =
          this.obtenerMensajeError(

            error,

            `No fue posible ${tipo} la cita. Revisa su estado e intenta nuevamente.`

          );

        this.cd.detectChanges();

      }

    });

  }


  // ========================================================
  // 22. INTERPRETAR ERRORES DEL BACKEND
  // ========================================================

  private obtenerMensajeError(

    error: any,

    mensajeGeneral: string

  ): string {


    // ======================================================
    // ERROR DE CONEXIÓN
    // ======================================================

    if (error?.status === 0) {

      return 'No hay conexión con Spring Boot. Comprueba el servidor y Tailscale.';

    }


    // ======================================================
    // SESIÓN NO AUTORIZADA
    // ======================================================

    if (
      error?.status === 401 ||
      error?.status === 403
    ) {

      return 'Tu sesión no tiene permisos para esta operación. Vuelve a iniciar sesión.';

    }


    // ======================================================
    // LEER MENSAJE DE SPRING BOOT
    // ======================================================

    const respuesta =
      error?.error;

    const mensaje =
      typeof respuesta === 'string'
        ? respuesta
        : (
          respuesta?.mensaje ??
          respuesta?.message ??
          respuesta?.detail
        );


    // ======================================================
    // DEVOLVER MENSAJE LEGIBLE
    // ======================================================

    return (
      typeof mensaje === 'string' &&
      mensaje.trim()
    )
      ? mensaje
      : mensajeGeneral;

  }


  // ========================================================
  // 23. IDENTIFICAR CITAS EN EL HTML
  // ========================================================

  /*
    Angular utiliza esta función para
    identificar cada cita dentro de *ngFor.

    Evita reconstruir elementos innecesariamente.
  */

  identificarCita(

    _index: number,

    cita: CitaVeterinario

  ): number {

    return cita.id;

  }

}
