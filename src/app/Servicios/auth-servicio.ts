import { environment } from '../../environments/environment';

/* ==========================================================
   VETERINARIA ARÉVALO
   SERVICIO DE AUTENTICACIÓN

   FUNCIONALIDADES:
   - Registrar usuarios.
   - Verificar correo electrónico.
   - Iniciar sesión mediante JWT.
   - Soportar los roles ADMIN, USER y VETERINARIO.
   - Mantener sesiones independientes por pestaña.
   - Obtener el rol y el token de la sesión actual.
   - Cerrar sesión sin afectar otras pestañas.
   ========================================================== */

import { Injectable } from '@angular/core';

import {
  HttpClient
} from '@angular/common/http';

import {
  Observable
} from 'rxjs';


// ==========================================================
// ROLES PERMITIDOS POR EL BACKEND
// ==========================================================

export type RolUsuario =
  | 'ADMIN'
  | 'USER'
  | 'VETERINARIO';


// ==========================================================
// RESPUESTA DEL LOGIN DE SPRING BOOT
// ==========================================================

export interface RespuestaLogin {
  token: string;
  rol: RolUsuario;
  mensaje?: string;
}


// ==========================================================
// SERVICIO
// ==========================================================

@Injectable({
  providedIn: 'root'
})
export class AuthServicio {

  // ========================================================
  // URL DEL BACKEND
  // ========================================================

  // Conservamos tu dirección de Tailscale.
  private readonly apiUrl =
    environment.apiUrl + '/auth';


  // ========================================================
  // CONSTRUCTOR
  // ========================================================

  constructor(
    private http: HttpClient
  ) {}


  // ========================================================
  // REGISTRAR USUARIO
  // ========================================================

  registrar(
    nombre: string,
    correo: string,
    password: string
  ): Observable<any> {

    return this.http.post(
      `${this.apiUrl}/registro`,
      {
        nombre,
        correo,
        password
      }
    );

  }


  // ========================================================
  // VERIFICAR CÓDIGO DE CORREO
  // ========================================================

  verificarCodigo(
    correo: string,
    codigo: string
  ): Observable<any> {

    return this.http.post(
      `${this.apiUrl}/verificar-codigo`,
      {
        correo,
        codigo
      }
    );

  }


  // ========================================================
  // INICIAR SESIÓN
  // ========================================================

  login(
    correo: string,
    password: string
  ): Observable<RespuestaLogin> {

    return this.http.post<RespuestaLogin>(
      `${this.apiUrl}/login`,
      {
        correo,
        password
      }
    );

  }


  // ========================================================
  // GUARDAR SESIÓN INDEPENDIENTE POR PESTAÑA
  // ========================================================

  /*
    sessionStorage permite que:

    Pestaña 1: ADMIN
    Pestaña 2: USER
    Pestaña 3: VETERINARIO

    Cada pestaña conserve su propio JWT y rol.

    No utilizamos localStorage para guardar la sesión,
    porque se comparte entre las pestañas del sitio.
  */

  guardarSesion(
    token: string,
    rol: RolUsuario
  ): void {

    sessionStorage.setItem(
      'token',
      token
    );

    sessionStorage.setItem(
      'rol',
      rol
    );

  }


  // ========================================================
  // OBTENER TOKEN JWT
  // ========================================================

  obtenerToken(): string | null {

    return sessionStorage.getItem(
      'token'
    );

  }


  // ========================================================
  // OBTENER ROL ACTUAL
  // ========================================================

  obtenerRol(): RolUsuario | null {

    const rol =
      sessionStorage.getItem('rol');

    if (
      rol === 'ADMIN' ||
      rol === 'USER' ||
      rol === 'VETERINARIO'
    ) {

      return rol;

    }

    return null;

  }


  // ========================================================
  // COMPROBAR SI EXISTE SESIÓN
  // ========================================================

  estaAutenticado(): boolean {

    return !!this.obtenerToken();

  }


  // ========================================================
  // OBTENER RUTA SEGÚN EL ROL
  // ========================================================

  obtenerRutaInicio(
    rol: RolUsuario
  ): string {

    switch (rol) {

      case 'ADMIN':
        return '/admin/dashboard';

      case 'VETERINARIO':
        return '/veterinario/dashboard';

      case 'USER':
        return '/usuario/dashboard';

      default:
        return '/login';

    }

  }


  // ========================================================
  // CERRAR SESIÓN DE LA PESTAÑA ACTUAL
  // ========================================================

  /*
    El cierre de sesión elimina únicamente
    el token y el rol de esta pestaña.

    No elimina los datos de las otras pestañas.
  */

  cerrarSesion(): void {

    sessionStorage.removeItem('token');

    sessionStorage.removeItem('rol');

    // Limpiar posibles sesiones antiguas.
    localStorage.removeItem('token');

    localStorage.removeItem('rol');

  }

}
