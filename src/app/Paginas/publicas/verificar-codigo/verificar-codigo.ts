
/* ==========================================================
   VETERINARIA AREVALO
   VERIFICACIÓN DE CUENTA

   MEJORAS DE USABILIDAD:
   - Código de exactamente cuatro números.
   - Se eliminan caracteres no numéricos.
   - Se muestra el correo recuperado del registro.
   - Mensajes claros de éxito y error.
   - Protección contra envíos repetidos.
   - Conserva la conexión con Spring Boot.
   ========================================================== */


// ==========================================================
// IMPORTACIONES
// ==========================================================

// Component permite crear el componente.
// ChangeDetectorRef actualiza la vista después de la API.
import {
  Component,
  ChangeDetectorRef
} from '@angular/core';

// Permite utilizar *ngIf en el HTML.
import { CommonModule } from '@angular/common';

// Herramientas para formularios reactivos.
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';

// Permite navegar entre las páginas.
import { Router } from '@angular/router';

// Servicio existente de autenticación.
import {
  AuthServicio
} from '../../../Servicios/auth-servicio';


// ==========================================================
// COMPONENTE DE VERIFICACIÓN
// ==========================================================

@Component({

  selector: 'app-verificar-codigo',

  standalone: true,

  imports: [
    CommonModule,
    ReactiveFormsModule
  ],

  templateUrl: './verificar-codigo.html',

  styleUrl: './verificar-codigo.scss'

})
export class VerificarCodigo {


  // ========================================================
  // FORMULARIO
  // ========================================================

  verificarForm: FormGroup;


  // ========================================================
  // ESTADOS DE LA INTERFAZ
  // ========================================================

  cargando: boolean = false;

  mensajeError: string = '';

  mensajeExito: string = '';


  // ========================================================
  // CORREO RECUPERADO DEL REGISTRO
  // ========================================================

  // El usuario no tiene que escribirlo nuevamente.
  correo: string = '';


  // ========================================================
  // CONSTRUCTOR
  // ========================================================

  constructor(

    private fb: FormBuilder,

    private authServicio: AuthServicio,

    private router: Router,

    private cd: ChangeDetectorRef

  ) {


    // ======================================================
    // FORMULARIO REACTIVO
    // ======================================================

    this.verificarForm = this.fb.group({

      codigo: [
        '',
        [
          Validators.required,

          // Acepta exactamente cuatro dígitos.
          Validators.pattern(/^[0-9]{4}$/)
        ]
      ]

    });


    // ======================================================
    // RECUPERAR CORREO TEMPORAL
    // ======================================================

    const correoGuardado =
      sessionStorage.getItem('correoVerificacion');


    if (correoGuardado) {

      this.correo = correoGuardado;

    } else {

      // Cuando se entra sin completar antes el registro.
      this.mensajeError =
        'No se encontró un registro pendiente de verificación. Regresa al registro.';

    }

  }


  // ========================================================
  // PERMITIR SOLO NÚMEROS EN EL CÓDIGO
  // ========================================================

  /**
   * Elimina letras, símbolos y espacios.
   * También limita el código a cuatro dígitos.
   *
   * Ayuda cuando se pega el código desde el correo.
   */
  limpiarCodigo(): void {

    const control =
      this.verificarForm.get('codigo');

    if (!control) {
      return;
    }

    const valorActual =
      String(control.value ?? '');

    const codigoLimpio =
      valorActual
        .replace(/\D/g, '')
        .slice(0, 4);

    if (valorActual !== codigoLimpio) {

      control.setValue(codigoLimpio, {
        emitEvent: false
      });

    }

  }


  // ========================================================
  // VERIFICAR CÓDIGO
  // ========================================================

  verificarCodigo(): void {


    // Evita enviar varias peticiones mientras se verifica.
    if (this.cargando) {
      return;
    }


    // Limpiamos los mensajes anteriores.
    this.mensajeError = '';

    this.mensajeExito = '';


    // ======================================================
    // VALIDAR EL CORREO DEL REGISTRO
    // ======================================================

    if (!this.correo) {

      this.mensajeError =
        'No se encontró el correo asociado al registro.';

      return;

    }


    // ======================================================
    // VALIDAR EL FORMULARIO
    // ======================================================

    this.limpiarCodigo();

    if (this.verificarForm.invalid) {

      this.verificarForm.markAllAsTouched();

      return;

    }


    // Obtener el código sin convertirlo a número.
    // Así no se pierden ceros al inicio, por ejemplo 0042.
    const codigo = String(
      this.verificarForm.get('codigo')?.value ?? ''
    );


    // Mostrar el estado de carga.
    this.cargando = true;


    // ======================================================
    // ENVIAR LA VERIFICACIÓN A SPRING BOOT
    // ======================================================

    /*
      Se conserva el método del servicio existente:

      verificarCodigo(correo, codigo)

      Endpoint:
      POST /api/auth/verificar-codigo
    */

    this.authServicio
      .verificarCodigo(
        this.correo,
        codigo
      )
      .subscribe({


        // ==================================================
        // VERIFICACIÓN CORRECTA
        // ==================================================

        next: (respuesta) => {

          this.cargando = false;

          // Mostrar el resultado de la verificación.
          this.mensajeExito =
            respuesta?.mensaje ||
            'Tu correo fue verificado correctamente.';

          // El correo temporal ya no es necesario.
          sessionStorage.removeItem(
            'correoVerificacion'
          );

          this.cd.detectChanges();


          // Conservamos la navegación original.
          // La aprobación del ADMIN sigue siendo necesaria.
          setTimeout(() => {

            void this.router.navigate([
              '/login'
            ]);

          }, 1500);

        },


        // ==================================================
        // ERROR DE VERIFICACIÓN
        // ==================================================

        error: (error) => {

          this.cargando = false;

          // Buscar el mensaje enviado por Spring Boot.
          const mensajeBackend =
            error?.error?.mensaje ||
            error?.error?.message ||
            error?.error?.detalle ||
            error?.error?.detail ||
            '';


          // Error de conexión con la API.
          if (error?.status === 0) {

            this.mensajeError =
              'No se pudo conectar con el servidor. Comprueba que la API esté encendida.';

          } else {

            // Mostrar el error recibido o un mensaje general.
            this.mensajeError =
              typeof mensajeBackend === 'string' &&
              mensajeBackend.trim()
                ? mensajeBackend
                : 'No se pudo verificar el código. Revísalo e intenta nuevamente.';

          }

          this.cd.detectChanges();

        }

      });

  }


  // ========================================================
  // VOLVER AL REGISTRO
  // ========================================================

  volverRegistro(): void {

    void this.router.navigate([
      '/registro'
    ]);

  }


  // ========================================================
  // VOLVER AL LOGIN
  // ========================================================

  irLogin(): void {

    void this.router.navigate([
      '/login'
    ]);

  }

}
