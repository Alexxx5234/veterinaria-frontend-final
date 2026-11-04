
/* ==========================================================
   VETERINARIA AREVALO
   SERVICIO DE AUTENTICACIÓN
   ========================================================== */

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthServicio {

  // URL CORRECTA DEL BACKEND MEDIANTE TAILSCALE
  private apiUrl = 'http://100.110.172.31:8080/api/auth';

  constructor(
    private http: HttpClient
  ) {}

  // REGISTRAR USUARIO
  registrar(
    nombre: string,
    correo: string,
    password: string
  ): Observable<any> {

    const datosRegistro = {
      nombre,
      correo,
      password
    };

    return this.http.post(
      `${this.apiUrl}/registro`,
      datosRegistro
    );
  }

  // VERIFICAR CÓDIGO
  verificarCodigo(
    correo: string,
    codigo: string
  ): Observable<any> {

    const datosVerificacion = {
      correo,
      codigo
    };

    return this.http.post(
      `${this.apiUrl}/verificar-codigo`,
      datosVerificacion
    );
  }

  // INICIAR SESIÓN
  login(
    correo: string,
    password: string
  ): Observable<any> {

    const datosLogin = {
      correo,
      password
    };

    return this.http.post(
      `${this.apiUrl}/login`,
      datosLogin
    );
  }

  // GUARDAR SESIÓN INDEPENDIENTE POR PESTAÑA
  guardarSesion(
    token: string,
    rol: string
  ): void {

    localStorage.removeItem('token');
    localStorage.removeItem('rol');

    sessionStorage.setItem('token', token);
    sessionStorage.setItem('rol', rol);
  }

  // OBTENER TOKEN
  obtenerToken(): string | null {
    return sessionStorage.getItem('token');
  }

  // OBTENER ROL
  obtenerRol(): string | null {
    return sessionStorage.getItem('rol');
  }

  // COMPROBAR AUTENTICACIÓN
  estaAutenticado(): boolean {
    return !!this.obtenerToken();
  }

  // CERRAR SESIÓN
  cerrarSesion(): void {

    sessionStorage.removeItem('token');
    sessionStorage.removeItem('rol');

    localStorage.removeItem('token');
    localStorage.removeItem('rol');
  }
}
