
/* ==========================================================
   VETERINARIA AREVALO
   REGISTRO DE USUARIOS

   MEJORAS DE USABILIDAD:
   - Validación de datos y contraseñas.
   - Mensajes claros para el usuario.
   - Mostrar y ocultar contraseñas.
   - Evitar registros duplicados durante la carga.
   - Conservar la conexión con Spring Boot.
   ========================================================== */

// ==========================================================
// IMPORTACIONES DE ANGULAR
// ==========================================================

import {
  Component,
  ChangeDetectorRef
} from '@angular/core';

import { CommonModule } from '@angular/common';

import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators
} from '@angular/forms';

import { Router } from '@angular/router';

// Servicio existente que consume la API REST.
import {
  AuthServicio
} from '../../../Servicios/auth-servicio';


// ==========================================================
// VALIDACIÓN DE CONTRASEÑAS
// ==========================================================

/**
 * Comprueba que la contraseña y su confirmación
 * sean iguales antes de enviar los datos.
 */
const validarPasswords: ValidatorFn = (
  formulario: AbstractControl
): ValidationErrors | null => {

  const password =
    formulario.get('password')?.value;

  const confirmacion =
    formulario.get('confirmarPassword')?.value;

  // No mostrar el error mientras algún campo esté vacío.
  if (!password || !confirmacion) {
    return null;
  }

  // Si son diferentes, Angular marca el formulario inválido.
  return password === confirmacion
    ? null
    : { passwordsDiferentes: true };

};


// ==========================================================
// COMPONENTE REGISTRO
// ==========================================================

@Component({

  selector: 'app-registro',

  standalone: true,

  imports: [
    CommonModule,
    ReactiveFormsModule
  ],

  templateUrl: './registro.html',

  styleUrl: './registro.scss'

})
export class Registro {


  // ========================================================
  // FORMULARIO
  // ========================================================

  registroForm: FormGroup;


  // ========================================================
  // VARIABLES DE CONTROL
  // ========================================================

  // Controla el estado del botón al registrar.
  cargando: boolean = false;

  // Mensaje recibido cuando ocurre un error.
  mensajeError: string = '';

  // Mensaje recibido cuando el registro es correcto.
  mensajeExito: string = '';

  // Controlan la visibilidad de cada contraseña.
  mostrarPassword: boolean = false;

  mostrarConfirmarPassword: boolean = false;


  // ========================================================
  // CONSTRUCTOR
  // ========================================================

  constructor(

    private fb: FormBuilder,

    private authServicio: AuthServicio,

    private router: Router,

    private cd: ChangeDetectorRef

  ) {

    // Creamos el formulario con sus validaciones.
    this.registroForm = this.fb.group({

      nombre: [
        '',
        [
          Validators.required,
          Validators.minLength(3)
        ]
      ],

      correo: [
        '',
        [
          Validators.required,
          Validators.email
        ]
      ],

      password: [
        '',
        [
          Validators.required,
          Validators.minLength(6)
        ]
      ],

      confirmarPassword: [
        '',
        Validators.required
      ]

    }, {

      // Comprueba que coincidan las contraseñas.
      validators: validarPasswords

    });

  }


  // ========================================================
  // MOSTRAR / OCULTAR CONTRASEÑA
  // ========================================================

  cambiarVisibilidadPassword(): void {

    this.mostrarPassword =
      !this.mostrarPassword;

  }


  // ========================================================
  // MOSTRAR / OCULTAR CONFIRMACIÓN
  // ========================================================

  cambiarVisibilidadConfirmacion(): void {

    this.mostrarConfirmarPassword =
      !this.mostrarConfirmarPassword;

  }


  // ========================================================
  // REGISTRAR USUARIO
  // ========================================================

  registrar(): void {

    // Evitar que se envíe más de una petición.
    if (this.cargando) {
      return;
    }

    // Limpiamos los mensajes anteriores.
    this.mensajeError = '';
    this.mensajeExito = '';

    // Si existen campos incorrectos, mostramos sus errores.
    if (this.registroForm.invalid) {

      this.registroForm.markAllAsTouched();

      // Mensaje general solamente para contraseñas diferentes.
      if (
        this.registroForm.hasError('passwordsDiferentes')
      ) {

        this.mensajeError =
          'Las contraseñas no coinciden. Revisa la confirmación.';

      }

      return;

    }


    // ======================================================
    // OBTENER DATOS DEL FORMULARIO
    // ======================================================

    // Quitamos espacios accidentales del nombre y correo.
    const nombre = String(
      this.registroForm.get('nombre')?.value ?? ''
    ).trim();

    const correo = String(
      this.registroForm.get('correo')?.value ?? ''
    ).trim();

    // La contraseña conserva todos sus caracteres.
    const password = String(
      this.registroForm.get('password')?.value ?? ''
    );

    // Comprobar los campos después de quitar espacios.
    if (nombre.length < 3) {

      this.registroForm.get('nombre')?.setErrors({
        minlength: true
      });

      this.mensajeError =
        'El nombre debe tener al menos 3 caracteres.';

      return;

    }


    // ======================================================
    // ENVIAR DATOS A SPRING BOOT
    // ======================================================

    this.cargando = true;

    this.authServicio
      .registrar(
        nombre,
        correo,
        password
      )
      .subscribe({


        // ==================================================
        // REGISTRO CORRECTO
        // ==================================================

        next: (respuesta) => {

          this.cargando = false;

          // Presentar confirmación del registro.
          this.mensajeExito =
            respuesta?.mensaje ||
            'Cuenta registrada correctamente.';

          // Guardar correo para verificar el código.
          sessionStorage.setItem(
            'correoVerificacion',
            correo
          );

          this.cd.detectChanges();

          // Se mantiene el flujo de verificación original.
          setTimeout(() => {

            void this.router.navigate([
              '/verificar-codigo'
            ]);

          }, 1000);

        },


        // ==================================================
        // ERROR DEL BACKEND
        // ==================================================

        error: (error) => {

          this.cargando = false;

          const mensajeBackend =
            error?.error?.mensaje ||
            error?.error?.message ||
            error?.error?.detalle ||
            error?.error?.detail ||
            '';

          // Si la API no responde, mostrar un mensaje claro.
          if (error?.status === 0) {

            this.mensajeError =
              'No se pudo conectar con el servidor. Verifica que la API esté encendida.';

          } else {

            this.mensajeError =
              typeof mensajeBackend === 'string' &&
              mensajeBackend.trim()
                ? mensajeBackend
                : 'No se pudo registrar la cuenta. Intenta nuevamente.';

          }

          this.cd.detectChanges();

        }

      });

  }


  // ========================================================
  // REGRESAR AL LOGIN
  // ========================================================

  irLogin(): void {

    void this.router.navigate([
      '/login'
    ]);

  }

}
