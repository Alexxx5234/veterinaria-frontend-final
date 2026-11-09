import { environment } from '../../../../environments/environment';

/* ==========================================================
   VETERINARIA ARÉVALO
   MÓDULO: ATENCIONES MÉDICAS DEL VETERINARIO

   FUNCIONALIDADES:
   1. Consultar citas asignadas al veterinario.
   2. Mostrar citas confirmadas.
   3. Registrar diagnósticos.
   4. Registrar tratamientos.
   5. Guardar observaciones clínicas.
   6. Consultar historial de atenciones.
   7. Evitar registros duplicados.
   8. Mantener autenticación mediante JWT.
   9. Mostrar mensajes de éxito y error.
   10. Evitar cargas infinitas.

   CORRECCIÓN:
   - Tiempo máximo de 15 segundos por consulta.
   - Control de errores independientes.
   - Finalización del estado de carga.
   - Evita peticiones de actualización simultáneas.
   - Diferencia errores de listas vacías.

   IMPORTANTE:
   La cita pasa automáticamente a COMPLETADA
   cuando Spring Boot registra la atención médica.
   ========================================================== */


// ==========================================================
// 1. IMPORTACIONES DE ANGULAR
// ==========================================================

import {
  Component,
  OnInit,
  ChangeDetectorRef
} from '@angular/core';


// Permite utilizar *ngIf, *ngFor y DatePipe.
import {
  CommonModule
} from '@angular/common';


// Herramientas para los formularios reactivos.
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';


// Permite consultar el backend con JWT.
import {
  HttpClient,
  HttpHeaders
} from '@angular/common/http';


// Permite recibir el ID de una cita desde la URL.
import {
  ActivatedRoute
} from '@angular/router';


// Permite realizar varias consultas simultáneamente.
import {
  forkJoin,
  of
} from 'rxjs';


// Maneja errores y limita el tiempo de espera.
import {
  catchError,
  timeout
} from 'rxjs/operators';


// Servicio de autenticación existente.
import {
  AuthServicio
} from '../../../Servicios/auth-servicio';


// ==========================================================
// 2. INTERFAZ DE LAS CITAS ASIGNADAS
// ==========================================================

/*
  Representa la información de una cita
  recibida desde Spring Boot.

  Los campos opcionales evitan errores
  cuando algún dato no está disponible.
*/

interface CitaAsignada {

  id: number;

  fechaHora?: string;

  estado?: string;

  motivo?: string;

  mascota?: {

    nombre?: string;

    especie?: string;

  };

  servicio?: {

    nombre?: string;

  };

}


// ==========================================================
// 3. INTERFAZ DE LA ATENCIÓN MÉDICA
// ==========================================================

/*
  Representa la información clínica
  registrada por el veterinario.
*/

interface AtencionMedica {

  id: number;

  citaId: number;

  mascotaId?: number;

  nombreMascota?: string;

  nombreVeterinario?: string;

  diagnostico: string;

  tratamiento: string;

  observaciones?: string;

  fechaAtencion?: string;

}


// ==========================================================
// 4. COMPONENTE ANGULAR
// ==========================================================

@Component({

  selector: 'app-atenciones-veterinario',

  standalone: true,

  imports: [
    CommonModule,
    ReactiveFormsModule
  ],

  templateUrl: './atenciones-veterinario.html',

  styleUrl: './atenciones-veterinario.scss'

})
export class AtencionesVeterinario implements OnInit {


  // ========================================================
  // 5. CONFIGURACIÓN DE LA API REST
  // ========================================================

  /*
    Conservamos la dirección Tailscale
    que ya utiliza Veterinaria Arévalo.
  */

  private readonly apiUrl =
    environment.apiUrl;


  // ========================================================
  // 6. TIEMPO MÁXIMO DE ESPERA
  // ========================================================

  /*
    Cada consulta tendrá un máximo de 15 segundos.

    Si Spring Boot no responde dentro de ese plazo,
    Angular cancelará la consulta y mostrará un error.

    Esto evita permanecer indefinidamente
    con el mensaje "Actualizando...".
  */

  private readonly tiempoMaximoConsulta = 15000;


  // ========================================================
  // 7. FORMULARIO REACTIVO
  // ========================================================

  atencionForm: FormGroup;


  // ========================================================
  // 8. DATOS RECIBIDOS DEL BACKEND
  // ========================================================

  // Citas asignadas al veterinario autenticado.
  citas: CitaAsignada[] = [];

  // Historial de atenciones del veterinario.
  atenciones: AtencionMedica[] = [];


  // ========================================================
  // 9. ESTADOS DE LA INTERFAZ
  // ========================================================

  /*
    cargando:
    Indica si estamos consultando información.

    guardando:
    Indica si estamos registrando una atención.

    errorCitas:
    Indica si falló la consulta de citas.

    errorAtenciones:
    Indica si falló la consulta del historial.
  */

  cargando: boolean = false;

  guardando: boolean = false;

  errorCitas: boolean = false;

  errorAtenciones: boolean = false;


  // ========================================================
  // 10. MENSAJES PARA EL USUARIO
  // ========================================================

  mensajeError: string = '';

  mensajeExito: string = '';


  // ========================================================
  // 11. CITA PRESELECCIONADA
  // ========================================================

  /*
    Permite abrir el formulario con una cita
    seleccionada desde otra pantalla.

    Ejemplo:

    /veterinario/atenciones?citaId=5
  */

  private citaPreseleccionada: number | null = null;


  // ========================================================
  // 12. CONSTRUCTOR
  // ========================================================

  constructor(

    private fb: FormBuilder,

    private http: HttpClient,

    private authServicio: AuthServicio,

    private route: ActivatedRoute,

    private cd: ChangeDetectorRef

  ) {


    // ======================================================
    // CONFIGURACIÓN DEL FORMULARIO
    // ======================================================

    this.atencionForm = this.fb.group({

      // ID de una cita confirmada.
      citaId: [
        null,
        Validators.required
      ],


      // Diagnóstico médico obligatorio.
      diagnostico: [
        '',
        [
          Validators.required,
          Validators.maxLength(2000)
        ]
      ],


      // Tratamiento médico obligatorio.
      tratamiento: [
        '',
        [
          Validators.required,
          Validators.maxLength(2000)
        ]
      ],


      // Observaciones opcionales.
      observaciones: [
        '',
        Validators.maxLength(2000)
      ]

    });

  }


  // ========================================================
  // 13. INICIALIZAR COMPONENTE
  // ========================================================

  ngOnInit(): void {


    // ======================================================
    // OBTENER ID OPCIONAL DESDE LA URL
    // ======================================================

    const parametro =
      this.route.snapshot.queryParamMap.get('citaId');

    if (parametro !== null) {

      const id = Number(parametro);

      if (
        Number.isInteger(id) &&
        id > 0
      ) {

        this.citaPreseleccionada = id;

      }

    }


    // ======================================================
    // CARGAR INFORMACIÓN DESDE SPRING BOOT
    // ======================================================

    this.cargarDatos();

  }


  // ========================================================
  // 14. OBTENER ENCABEZADOS JWT
  // ========================================================

  /*
    Recuperamos el JWT guardado en sessionStorage.

    De esta manera, el veterinario utiliza
    únicamente la sesión de su pestaña.

    El backend determina qué veterinario
    está autenticado a partir del JWT.
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
  // 15. CONSULTAR CITAS Y ATENCIONES
  // ========================================================

  /*
    CORRECCIÓN PRINCIPAL:

    Utilizamos forkJoin para consultar:

    GET /api/citas/mis-citas-veterinario

    GET /api/atenciones-medicas/mis-atenciones

    Cada consulta tiene timeout de 15 segundos.

    Si una consulta falla, la otra puede continuar.

    Una consulta fallida se representa mediante null.

    Una consulta correcta sin registros se
    representa mediante un arreglo vacío [].
  */

  cargarDatos(): void {


    // ======================================================
    // EVITAR PETICIONES REPETIDAS
    // ======================================================

    if (
      this.guardando ||
      this.cargando
    ) {

      return;

    }


    // ======================================================
    // ACTIVAR ESTADO DE CARGA
    // ======================================================

    this.cargando = true;

    this.errorCitas = false;

    this.errorAtenciones = false;

    this.mensajeError = '';


    // Preparar token JWT.
    const headers =
      this.obtenerHeaders();


    // ======================================================
    // CONSULTAR LOS DOS ENDPOINTS
    // ======================================================

    forkJoin({


      // ----------------------------------------------------
      // CONSULTA 1: CITAS DEL VETERINARIO
      // ----------------------------------------------------

      citas: this.http.get<CitaAsignada[]>(

        `${this.apiUrl}/citas/mis-citas-veterinario`,

        {
          headers
        }

      ).pipe(


        // Máximo de 15 segundos.
        timeout(this.tiempoMaximoConsulta),


        // Evitar que un error bloquee todo.
        catchError(error => {

          console.error(
            'Error consultando citas del veterinario:',
            error
          );

          return of(null);

        })

      ),


      // ----------------------------------------------------
      // CONSULTA 2: HISTORIAL MÉDICO
      // ----------------------------------------------------

      atenciones: this.http.get<AtencionMedica[]>(

        `${this.apiUrl}/atenciones-medicas/mis-atenciones`,

        {
          headers
        }

      ).pipe(


        // Máximo de 15 segundos.
        timeout(this.tiempoMaximoConsulta),


        // Permitir continuar aunque falle.
        catchError(error => {

          console.error(
            'Error consultando atenciones médicas:',
            error
          );

          return of(null);

        })

      )

    }).subscribe({


      // ====================================================
      // 16. RESPUESTA DE LAS CONSULTAS
      // ====================================================

      next: ({ citas, atenciones }) => {


        // ==================================================
        // COMPROBAR RESULTADOS
        // ==================================================

        /*
          Es diferente:

          []   = consulta correcta, sin datos.
          null = consulta fallida.
        */

        this.errorCitas =
          !Array.isArray(citas);

        this.errorAtenciones =
          !Array.isArray(atenciones);


        // ==================================================
        // ACTUALIZAR CITAS
        // ==================================================

        if (Array.isArray(citas)) {

          this.citas = [...citas].sort(
            (a, b) => {

              return (
                a.fechaHora ?? ''
              ).localeCompare(
                b.fechaHora ?? ''
              );

            }
          );

        } else {

          this.citas = [];

        }


        // ==================================================
        // ACTUALIZAR HISTORIAL MÉDICO
        // ==================================================

        if (Array.isArray(atenciones)) {

          this.atenciones = [...atenciones].sort(
            (a, b) => {

              return (
                b.fechaAtencion ?? ''
              ).localeCompare(
                a.fechaAtencion ?? ''
              );

            }
          );

        } else {

          this.atenciones = [];

        }


        // ==================================================
        // PRESELECCIONAR CITA DESDE LA URL
        // ==================================================

        /*
          Verificamos que la cita pertenezca al
          veterinario y esté CONFIRMADA.

          También comprobamos que no tenga
          una atención registrada.
        */

        if (this.citaPreseleccionada !== null) {

          const citaEncontrada =
            this.citasConfirmadas.find(

              cita =>
                cita.id === this.citaPreseleccionada

            );


          if (citaEncontrada) {

            this.atencionForm.patchValue({

              citaId: citaEncontrada.id

            });

          }


          // Limpiar la preselección únicamente
          // cuando las consultas sean correctas.
          if (
            !this.errorCitas &&
            !this.errorAtenciones
          ) {

            this.citaPreseleccionada = null;

          }

        }


        // ==================================================
        // MOSTRAR MENSAJES DE ERROR
        // ==================================================

        if (
          this.errorCitas &&
          this.errorAtenciones
        ) {

          this.mensajeError =
            'No se pudieron consultar las citas ni el historial médico. Comprueba Spring Boot, la conexión Tailscale y vuelve a actualizar.';

        }

        else if (this.errorCitas) {

          this.mensajeError =
            'No se pudieron consultar tus citas asignadas. Intenta actualizar la página.';

        }

        else if (this.errorAtenciones) {

          this.mensajeError =
            'No se pudo consultar el historial de atenciones médicas. Intenta actualizar la página.';

        }


        // ==================================================
        // FINALIZAR ESTADO DE CARGA
        // ==================================================

        /*
          Esta instrucción es importante:

          Garantiza que desaparezca
          el mensaje "Actualizando...".
        */

        this.cargando = false;


        // Actualizar la interfaz de Angular.
        this.cd.detectChanges();

      },


      // ====================================================
      // 17. ERROR GENERAL
      // ====================================================

      error: error => {

        console.error(
          'Error general cargando atenciones:',
          error
        );


        this.errorCitas = true;

        this.errorAtenciones = true;


        this.mensajeError =
          'Ocurrió un error al cargar la información. Comprueba la conexión con el servidor.';


        // Evitar que la pantalla quede bloqueada.
        this.cargando = false;


        // Mostrar el mensaje de error.
        this.cd.detectChanges();

      }

    });

  }


  // ========================================================
  // 18. CONSULTAR CITAS DISPONIBLES PARA ATENCIÓN
  // ========================================================

  /*
    Solo mostramos citas CONFIRMADAS.

    No mostramos:
    - PENDIENTES.
    - CANCELADAS.
    - COMPLETADAS.
    - Citas con atención médica existente.

    El backend vuelve a validar estas condiciones.
  */

  get citasConfirmadas(): CitaAsignada[] {


    // Si no tenemos datos válidos, no permitir
    // seleccionar ninguna cita.
    if (
      this.errorCitas ||
      this.errorAtenciones
    ) {

      return [];

    }


    // Obtener los IDs de citas ya atendidas.
    const citasAtendidas = new Set(

      this.atenciones.map(

        atencion => atencion.citaId

      )

    );


    return this.citas.filter(cita => {


      // Comprobar estado.
      const confirmada =

        cita.estado?.toUpperCase() ===
        'CONFIRMADA';


      // Comprobar si ya fue atendida.
      const yaAtendida =
        citasAtendidas.has(cita.id);


      return (
        confirmada &&
        !yaAtendida
      );

    });

  }


  // ========================================================
  // 19. ESTADÍSTICAS DE LA PÁGINA
  // ========================================================

  /*
    Los números se calculan utilizando
    la información real de Spring Boot.
  */


  // Citas listas para recibir atención.
  get totalConfirmadas(): number {

    return this.citasConfirmadas.length;

  }


  // Atenciones registradas.
  get totalAtenciones(): number {

    return this.atenciones.length;

  }


  // Citas pendientes de aceptación.
  get totalPendientes(): number {

    return this.citas.filter(

      cita =>
        cita.estado?.toUpperCase() ===
        'PENDIENTE'

    ).length;

  }


  // ========================================================
  // 20. IDENTIFICAR CITAS EN EL HTML
  // ========================================================

  /*
    trackBy evita reconstruir innecesariamente
    las tarjetas y opciones de Angular.
  */

  identificarCita(

    _index: number,

    cita: CitaAsignada

  ): number {

    return cita.id;

  }


  // ========================================================
  // 21. IDENTIFICAR ATENCIONES
  // ========================================================

  identificarAtencion(

    _index: number,

    atencion: AtencionMedica

  ): number {

    return atencion.id;

  }


  // ========================================================
  // 22. REGISTRAR NUEVA ATENCIÓN MÉDICA
  // ========================================================

  registrarAtencion(): void {


    // ======================================================
    // EVITAR REGISTROS SIMULTÁNEOS
    // ======================================================

    if (
      this.guardando ||
      this.cargando
    ) {

      return;

    }


    // ======================================================
    // COMPROBAR QUE LAS CONSULTAS SEAN VÁLIDAS
    // ======================================================

    if (
      this.errorCitas ||
      this.errorAtenciones
    ) {

      this.mensajeError =
        'No se puede registrar la atención porque falta información. Actualiza los datos e intenta nuevamente.';

      return;

    }


    // ======================================================
    // LIMPIAR MENSAJES ANTERIORES
    // ======================================================

    this.mensajeError = '';

    this.mensajeExito = '';


    // ======================================================
    // OBTENER CAMPOS DEL FORMULARIO
    // ======================================================

    const citaId = Number(

      this.atencionForm.get('citaId')?.value

    );


    const diagnostico = String(

      this.atencionForm.get('diagnostico')?.value
      ?? ''

    ).trim();


    const tratamiento = String(

      this.atencionForm.get('tratamiento')?.value
      ?? ''

    ).trim();


    const observaciones = String(

      this.atencionForm.get('observaciones')?.value
      ?? ''

    ).trim();


    // ======================================================
    // VALIDAR DIAGNÓSTICO
    // ======================================================

    if (!diagnostico) {

      this.atencionForm.get(
        'diagnostico'
      )?.setErrors({

        required: true

      });

    }


    // ======================================================
    // VALIDAR TRATAMIENTO
    // ======================================================

    if (!tratamiento) {

      this.atencionForm.get(
        'tratamiento'
      )?.setErrors({

        required: true

      });

    }


    // ======================================================
    // VALIDAR CITA CONFIRMADA
    // ======================================================

    /*
      No permitimos registrar atenciones
      sobre citas pendientes o canceladas.
    */

    const citaValida =

      this.citasConfirmadas.some(

        cita => cita.id === citaId

      );


    if (!citaValida) {

      this.mensajeError =
        'Debes seleccionar una cita confirmada y sin atención registrada.';

      this.atencionForm.get(
        'citaId'
      )?.markAsTouched();

      return;

    }


    // ======================================================
    // VALIDAR FORMULARIO REACTIVO
    // ======================================================

    if (this.atencionForm.invalid) {

      this.atencionForm.markAllAsTouched();

      this.mensajeError =
        'Revisa los campos obligatorios antes de guardar la atención.';

      return;

    }


    // ======================================================
    // PREPARAR DATOS PARA SPRING BOOT
    // ======================================================

    /*
      JSON enviado:

      {
        citaId: number,
        diagnostico: string,
        tratamiento: string,
        observaciones: string
      }

      El veterinario se identifica
      mediante su token JWT.
    */

    const datos = {

      citaId,

      diagnostico,

      tratamiento,

      observaciones

    };


    // ======================================================
    // ACTIVAR ESTADO DE GUARDADO
    // ======================================================

    this.guardando = true;


    // ======================================================
    // ENVIAR ATENCIÓN MÉDICA AL BACKEND
    // ======================================================

    this.http.post<AtencionMedica>(

      `${this.apiUrl}/atenciones-medicas`,

      datos,

      {

        headers: this.obtenerHeaders()

      }

    ).subscribe({


      // ====================================================
      // REGISTRO CORRECTO
      // ====================================================

      next: atencion => {


        // Finalizar el guardado.
        this.guardando = false;


        // ================================================
        // LIMPIAR FORMULARIO
        // ================================================

        this.atencionForm.reset({

          citaId: null,

          diagnostico: '',

          tratamiento: '',

          observaciones: ''

        });


        // ================================================
        // MOSTRAR CONFIRMACIÓN
        // ================================================

        const identificador =
          atencion?.id
            ? ` #${atencion.id}`
            : '';


        this.mensajeExito =
          `Atención médica${identificador} registrada correctamente. La cita pasó a COMPLETADA.`;



        // ================================================
        // ACTUALIZAR CITAS E HISTORIAL
        // ================================================

        this.cargarDatos();


        // Actualizar el formulario y el mensaje.
        this.cd.detectChanges();

      },


      // ====================================================
      // ERROR AL GUARDAR
      // ====================================================

      error: error => {


        // Finalizar el estado de guardado.
        this.guardando = false;


        // ================================================
        // ERROR DE CONEXIÓN
        // ================================================

        if (error?.status === 0) {

          this.mensajeError =
            'No se pudo conectar con Spring Boot. Comprueba Tailscale y la conexión del servidor.';

        }


        // ================================================
        // ERROR DE AUTORIZACIÓN
        // ================================================

        else if (
          error?.status === 401 ||
          error?.status === 403
        ) {

          this.mensajeError =
            'Tu sesión no tiene permisos para registrar esta atención médica.';

        }


        // ================================================
        // ERROR DEVUELTO POR SPRING BOOT
        // ================================================

        else {

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


          this.mensajeError =

            typeof mensaje === 'string' &&
            mensaje.trim()

              ? mensaje

              : 'No se pudo registrar la atención médica. Revisa los datos e intenta nuevamente.';

        }


        // Mostrar el error inmediatamente.
        this.cd.detectChanges();

      }

    });

  }

}
