
// ==========================================================
// VETERINARIA AREVALO
// LOGIN - MEJORAS DE USABILIDAD
// ==========================================================

// Component crea el componente Angular.
// ChangeDetectorRef permite actualizar los mensajes
// después de recibir una respuesta de Spring Boot.
import {
  Component,
  ChangeDetectorRef
} from '@angular/core';

// Permite usar *ngIf en el HTML.
import { CommonModule } from '@angular/common';

// Herramientas para el formulario reactivo.
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';

// Router permite cambiar de página.
// RouterLink permite ir al registro sin recargar la web.
import {
  Router,
  RouterLink
} from '@angular/router';

// Servicio existente de autenticación.
import {
  AuthServicio
} from '../../../Servicios/auth-servicio';


// ==========================================================
// COMPONENTE LOGIN
// ==========================================================

@Component({
  selector: 'app-login-compents',

  standalone: true,

  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink
  ],

  templateUrl: './login-compents.html',

  styleUrl: './login-compents.scss'
})
export class LoginCompents {


  // ========================================================
  // FORMULARIO REACTIVO
  // ========================================================

  loginForm: FormGroup;


  // ========================================================
  // VARIABLES DE LA INTERFAZ
  // ========================================================

  // Presenta errores de autenticación.
  mensajeError: string = '';

  // Evita enviar varias peticiones simultáneamente.
  cargando: boolean = false;

  // Controla si se muestra u oculta la contraseña.
  mostrarPassword: boolean = false;


  // ========================================================
  // CONSTRUCTOR
  // ========================================================

  constructor(
    private fb: FormBuilder,
    private authServicio: AuthServicio,
    private router: Router,
    private cd: ChangeDetectorRef
  ) {

    // Definimos los campos y sus validaciones.
    this.loginForm = this.fb.group({

      // Correo obligatorio y con formato válido.
      correo: [
        '',
        [
          Validators.required,
          Validators.email
        ]
      ],

      // Contraseña obligatoria.
      password: [
        '',
        Validators.required
      ]

    });

  }


  // ========================================================
  // MOSTRAR Y OCULTAR CONTRASEÑA
  // ========================================================

  cambiarVisibilidadPassword(): void {

    this.mostrarPassword = !this.mostrarPassword;

  }


  // ========================================================
  // INICIAR SESIÓN
  // ========================================================

  iniciarSesion(): void {

    // Evitamos hacer clic repetidamente mientras carga.
    if (this.cargando) {
      return;
    }

    // Limpiar mensajes anteriores.
    this.mensajeError = '';

    // Comprobar el formulario antes de enviarlo.
    if (this.loginForm.invalid) {

      // Mostrar errores debajo de los campos.
      this.loginForm.markAllAsTouched();

      return;
    }

    // Activar el estado de carga.
    this.cargando = true;

    // Eliminar espacios accidentales del correo.
    const correo = String(
      this.loginForm.get('correo')?.value ?? ''
    ).trim();

    // No modificar los caracteres de la contraseña.
    const password = String(
      this.loginForm.get('password')?.value ?? ''
    );


    // ======================================================
    // CONSUMIR API REST DE SPRING BOOT
    // ======================================================

    this.authServicio
      .login(correo, password)
      .subscribe({

        // ==================================================
        // RESPUESTA CORRECTA
        // ==================================================

        next: (respuesta: any) => {

          this.cargando = false;

          // Comprobar que la respuesta tenga token y rol.
          if (
            !respuesta?.token ||
            (
              respuesta?.rol !== 'ADMIN' &&
              respuesta?.rol !== 'USER'
            )
          ) {

            this.mensajeError =
              'No se pudo validar la sesión. Intenta nuevamente.';

            this.cd.detectChanges();

            return;
          }

          // Guardar el JWT y el rol.
          this.authServicio.guardarSesion(
            respuesta.token,
            respuesta.rol
          );

          // Redirigir según el rol autenticado.
          const ruta = respuesta.rol === 'ADMIN'
            ? '/admin/dashboard'
            : '/usuario/dashboard';

          this.cd.detectChanges();

          void this.router.navigateByUrl(ruta);

        },


        // ==================================================
        // ERROR DE INICIO DE SESIÓN
        // ==================================================

        error: (error: any) => {

          this.cargando = false;

          // Obtener el mensaje que devuelve Spring Boot.
          const mensajeBackend =
            this.obtenerMensajeBackend(error);

          const mensaje =
            mensajeBackend.toLowerCase();


          // Error de conexión con la API.
          if (error?.status === 0) {

            this.mensajeError =
              'No se pudo conectar con el servidor. Intenta nuevamente.';

          }

          // Usuario pendiente de aprobación.
          else if (
            mensaje.includes('aprobada') ||
            mensaje.includes('pendiente')
          ) {

            this.mensajeError =
              '⏳ Tu cuenta está pendiente de aprobación por el administrador.';

          }

          // Usuario sin verificar.
          else if (
            mensaje.includes('verificada') ||
            mensaje.includes('verificado')
          ) {

            this.mensajeError =
              '📧 Debes verificar tu cuenta antes de ingresar.';

          }

          // Cuenta rechazada.
          else if (mensaje.includes('rechazada')) {

            this.mensajeError =
              '❌ Tu cuenta fue rechazada por el administrador.';

          }

          // Cuenta bloqueada o desactivada.
          else if (
            mensaje.includes('bloqueada') ||
            mensaje.includes('bloqueado') ||
            mensaje.includes('desactivada') ||
            mensaje.includes('inactiva')
          ) {

            this.mensajeError =
              '🔒 Tu cuenta se encuentra bloqueada o desactivada.';

          }

          // Contraseña incorrecta.
          else if (
            mensaje.includes('contraseña incorrecta')
          ) {

            this.mensajeError =
              '🔑 La contraseña ingresada es incorrecta.';

          }

          // Usuario inexistente.
          else if (
            mensaje.includes('usuario no encontrado')
          ) {

            this.mensajeError =
              '👤 No existe una cuenta registrada con ese correo.';

          }

          // Mensaje general.
          else {

            this.mensajeError =
              mensajeBackend ||
              'No fue posible iniciar sesión. Revisa tus datos e intenta nuevamente.';

          }

          // Mostrar el mensaje inmediatamente.
          this.cd.detectChanges();

        }

      });

  }


  // ========================================================
  // OBTENER MENSAJE DE ERROR DEL BACKEND
  // ========================================================

  /**
   * Algunos errores de Spring Boot contienen
   * un mensaje en diferentes propiedades.
   *
   * Comprobamos que sea texto antes de utilizarlo.
   */
  private obtenerMensajeBackend(error: any): string {

    const respuesta = error?.error;

    // Si Spring Boot devuelve un texto directamente.
    if (typeof respuesta === 'string') {
      return respuesta;
    }

    // Si devuelve un objeto JSON.
    const mensaje =
      respuesta?.mensaje ??
      respuesta?.message ??
      respuesta?.detalle ??
      respuesta?.detail ??
      '';

    return typeof mensaje === 'string'
      ? mensaje
      : '';

  }

}
