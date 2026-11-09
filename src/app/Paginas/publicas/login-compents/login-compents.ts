
/* ==========================================================
   VETERINARIA ARÉVALO
   LOGIN - AUTENTICACIÓN CON TRES ROLES

   FUNCIONALIDADES:
   - Inicio de sesión mediante JWT.
   - Formularios reactivos con validaciones.
   - Mostrar y ocultar contraseña.
   - Mensajes de error accesibles.
   - Evitar solicitudes duplicadas.
   - Sesiones independientes por pestaña.
   - Redirección automática según el rol.

   ROLES:
   - ADMIN
   - USER
   - VETERINARIO

   IMPORTANTE:
   - Conserva la conexión con Spring Boot.
   - No modifica el diseño HTML ni el SCSS.
   - Compatible con el panel de accesibilidad.
   ========================================================== */


// ==========================================================
// 1. IMPORTACIONES DE ANGULAR
// ==========================================================

import {
  Component,
  ChangeDetectorRef
} from '@angular/core';

import {
  CommonModule
} from '@angular/common';


// ==========================================================
// 2. FORMULARIOS REACTIVOS
// ==========================================================

import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';


// ==========================================================
// 3. NAVEGACIÓN ANGULAR
// ==========================================================

import {
  Router,
  RouterLink
} from '@angular/router';


// ==========================================================
// 4. SERVICIO DE AUTENTICACIÓN
// ==========================================================

import {
  AuthServicio,
  RespuestaLogin
} from '../../../Servicios/auth-servicio';


// ==========================================================
// 5. COMPONENTE LOGIN
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
  // 6. FORMULARIO REACTIVO
  // ========================================================

  loginForm: FormGroup;


  // ========================================================
  // 7. VARIABLES DE LA INTERFAZ
  // ========================================================

  // Mensaje de error del formulario o de la API.
  mensajeError: string = '';

  // Evita solicitudes simultáneas.
  cargando: boolean = false;

  // Permite visualizar u ocultar la contraseña.
  mostrarPassword: boolean = false;


  // ========================================================
  // 8. CONSTRUCTOR
  // ========================================================

  constructor(

    private fb: FormBuilder,

    private authServicio: AuthServicio,

    private router: Router,

    private cd: ChangeDetectorRef

  ) {

    // ======================================================
    // CONFIGURAR VALIDACIONES
    // ======================================================

    this.loginForm = this.fb.group({

      correo: [
        '',
        [
          Validators.required,
          Validators.email
        ]
      ],

      password: [
        '',
        Validators.required
      ]

    });

  }


  // ========================================================
  // 9. MOSTRAR / OCULTAR CONTRASEÑA
  // ========================================================

  cambiarVisibilidadPassword(): void {

    this.mostrarPassword =
      !this.mostrarPassword;

  }


  // ========================================================
  // 10. INICIAR SESIÓN
  // ========================================================

  iniciarSesion(): void {

    // Evitar múltiples solicitudes.
    if (this.cargando) {
      return;
    }

    // Limpiar errores anteriores.
    this.mensajeError = '';


    // ======================================================
    // VALIDAR FORMULARIO
    // ======================================================

    if (this.loginForm.invalid) {

      this.loginForm.markAllAsTouched();

      return;

    }


    // ======================================================
    // OBTENER CREDENCIALES
    // ======================================================

    this.cargando = true;

    // Eliminar espacios accidentales del correo.
    const correo = String(
      this.loginForm.get('correo')?.value ?? ''
    ).trim();

    // Conservar la contraseña sin modificarla.
    const password = String(
      this.loginForm.get('password')?.value ?? ''
    );


    // ======================================================
    // 11. PETICIÓN AL BACKEND SPRING BOOT
    // ======================================================

    this.authServicio
      .login(correo, password)
      .subscribe({


        // ==================================================
        // 12. LOGIN CORRECTO
        // ==================================================

        next: (respuesta: RespuestaLogin) => {

          this.cargando = false;


          // ================================================
          // VALIDAR TOKEN Y ROL
          // ================================================

          /*
            Antes solo se permitían:

            ADMIN
            USER

            Ahora también se permite:

            VETERINARIO

            El token debe existir y el rol
            debe ser uno de los tres autorizados.
          */

          if (
            !respuesta?.token ||
            (
              respuesta?.rol !== 'ADMIN' &&
              respuesta?.rol !== 'USER' &&
              respuesta?.rol !== 'VETERINARIO'
            )
          ) {

            this.mensajeError =
              'No se pudo validar la sesión. Intenta nuevamente.';

            this.cd.detectChanges();

            return;

          }


          // ================================================
          // 13. GUARDAR SESIÓN JWT
          // ================================================

          /*
            AuthServicio utiliza sessionStorage.

            Esto permite mantener:

            Pestaña 1 -> ADMIN
            Pestaña 2 -> USER
            Pestaña 3 -> VETERINARIO

            Cada pestaña conserva su propio token.
          */

          this.authServicio.guardarSesion(
            respuesta.token,
            respuesta.rol
          );


          // ================================================
          // 14. OBTENER DASHBOARD SEGÚN EL ROL
          // ================================================

          /*
            ADMIN:
            /admin/dashboard

            USER:
            /usuario/dashboard

            VETERINARIO:
            /veterinario/dashboard
          */

          const ruta =
            this.authServicio.obtenerRutaInicio(
              respuesta.rol
            );


          // ================================================
          // 15. REDIRIGIR AL DASHBOARD
          // ================================================

          this.cd.detectChanges();

          void this.router.navigateByUrl(ruta)
            .then(navegacionCorrecta => {

              if (!navegacionCorrecta) {

                console.warn(
                  'No se pudo completar la navegación:',
                  ruta
                );

              }

            });

        },


        // ==================================================
        // 16. ERROR DE INICIO DE SESIÓN
        // ==================================================

        error: (error: any) => {

          this.cargando = false;


          // ================================================
          // OBTENER RESPUESTA DEL BACKEND
          // ================================================

          const mensajeBackend =
            this.obtenerMensajeBackend(error);

          const mensaje =
            mensajeBackend.toLowerCase();


          // ================================================
          // ERROR DE CONEXIÓN
          // ================================================

          if (error?.status === 0) {

            this.mensajeError =
              'No se pudo conectar con el servidor. Verifica que Spring Boot esté encendido y que la dirección de la API sea correcta.';

          }


          // ================================================
          // CUENTA PENDIENTE DE APROBACIÓN
          // ================================================

          else if (
            mensaje.includes('pendiente') ||
            mensaje.includes('no está aprobada') ||
            mensaje.includes('no ha sido aprobada')
          ) {

            this.mensajeError =
              '⏳ Tu cuenta está pendiente de aprobación por el administrador.';

          }


          // ================================================
          // CORREO SIN VERIFICAR
          // ================================================

          else if (
            mensaje.includes('sin verificar') ||
            mensaje.includes('no verificada') ||
            mensaje.includes('no verificado') ||
            mensaje.includes('debes verificar')
          ) {

            this.mensajeError =
              '📧 Debes verificar tu correo electrónico antes de ingresar.';

          }


          // ================================================
          // CUENTA RECHAZADA
          // ================================================

          else if (
            mensaje.includes('rechazada') ||
            mensaje.includes('rechazado')
          ) {

            this.mensajeError =
              '❌ Tu cuenta fue rechazada por el administrador.';

          }


          // ================================================
          // CUENTA BLOQUEADA O DESACTIVADA
          // ================================================

          else if (
            mensaje.includes('bloqueada') ||
            mensaje.includes('bloqueado') ||
            mensaje.includes('desactivada') ||
            mensaje.includes('desactivado') ||
            mensaje.includes('inactiva') ||
            mensaje.includes('inactivo')
          ) {

            this.mensajeError =
              '🔒 Tu cuenta se encuentra bloqueada o desactivada.';

          }


          // ================================================
          // CONTRASEÑA INCORRECTA
          // ================================================

          else if (
            mensaje.includes('contraseña incorrecta') ||
            mensaje.includes('credenciales incorrectas')
          ) {

            this.mensajeError =
              '🔑 La contraseña ingresada es incorrecta.';

          }


          // ================================================
          // CUENTA INEXISTENTE
          // ================================================

          else if (
            mensaje.includes('usuario no encontrado') ||
            mensaje.includes('correo no registrado')
          ) {

            this.mensajeError =
              '👤 No existe una cuenta registrada con ese correo electrónico.';

          }


          // ================================================
          // ERROR GENERAL
          // ================================================

          else {

            this.mensajeError =
              mensajeBackend ||
              'No fue posible iniciar sesión. Revisa tus datos e intenta nuevamente.';

          }


          // ================================================
          // ACTUALIZAR LA INTERFAZ
          // ================================================

          this.cd.detectChanges();

        }

      });

  }


  // ========================================================
  // 17. OBTENER MENSAJE DE ERROR DEL BACKEND
  // ========================================================

  /*
    Spring Boot puede devolver errores en
    diferentes formatos.

    Este método recupera el texto sin generar
    errores cuando la respuesta es nula.
  */

  private obtenerMensajeBackend(
    error: any
  ): string {

    const respuesta =
      error?.error;


    // ================================================
    // RESPUESTA COMO TEXTO
    // ================================================

    if (
      typeof respuesta === 'string'
    ) {

      return respuesta;

    }


    // ================================================
    // RESPUESTA COMO OBJETO JSON
    // ================================================

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
