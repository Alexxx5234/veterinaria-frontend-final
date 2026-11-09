import { environment } from '../../environments/environment';

// ==========================================================
// VETERINARIA ARÉVALO
// SERVICIO DE ADMINISTRACIÓN DE USUARIOS
//
// FUNCIONES:
// 1. Consultar todos los usuarios.
// 2. Consultar usuarios pendientes.
// 3. Filtrar cuentas disponibles para veterinarios.
// 4. Aprobar usuarios.
// 5. Rechazar usuarios.
// 6. Bloquear usuarios.
// 7. Activar usuarios.
// 8. Eliminar usuarios.
//
// IMPORTANTE:
// La asignación del rol VETERINARIO se realiza
// desde VeterinarioController y VeterinarioServicio.
// ==========================================================

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

// ==========================================================
// INTERFAZ DE USUARIO ADMINISTRATIVO
// ==========================================================

export interface UsuarioAdmin {
  id: number;
  nombre: string;
  correo: string;
  rol: string;
  estado: string;
  verificado: boolean;
  activo: boolean;
  fechaCreacion?: string;
}

// ==========================================================
// SERVICIO
// ==========================================================

@Injectable({
  providedIn: 'root'
})
export class AdminUsuarioServicio {

  // Dirección del controlador administrativo.
  private readonly apiUrl =
    environment.apiUrl + '/admin';

  constructor(
    private http: HttpClient
  ) {}

  // ========================================================
  // 1. LISTAR TODOS LOS USUARIOS
  // GET /api/admin/usuarios
  // ========================================================

  listarUsuarios(): Observable<UsuarioAdmin[]> {
    return this.http.get<UsuarioAdmin[]>(
      `${this.apiUrl}/usuarios`
    );
  }

  // ========================================================
  // 2. LISTAR USUARIOS PENDIENTES
  // GET /api/admin/usuarios-pendientes
  // ========================================================

  listarPendientes(): Observable<UsuarioAdmin[]> {
    return this.http.get<UsuarioAdmin[]>(
      `${this.apiUrl}/usuarios-pendientes`
    );
  }

  // ========================================================
  // 3. CUENTAS DISPONIBLES PARA ASIGNAR VETERINARIOS
  //
  // CONDICIONES:
  // - El usuario debe tener rol USER.
  // - El correo debe estar verificado.
  // - El estado debe ser PENDIENTE o APROBADA.
  //
  // No se filtra por activo porque el backend activa
  // la cuenta al asignarle el rol VETERINARIO.
  //
  // No se muestran cuentas ADMIN, VETERINARIO,
  // RECHAZADAS o BLOQUEADAS.
  //
  // Este método no modifica la base de datos.
  // ========================================================

  listarUsuariosDisponiblesParaVeterinario():
    Observable<UsuarioAdmin[]> {

    return this.listarUsuarios().pipe(

      map(usuarios =>

        usuarios.filter(usuario => {

          const rol = String(
            usuario.rol ?? ''
          ).trim().toUpperCase();

          const estado = String(
            usuario.estado ?? ''
          ).trim().toUpperCase();

          const estadoPermitido = [
            'PENDIENTE',
            'APROBADA'
          ].includes(estado);

          return (
            rol === 'USER' &&
            usuario.verificado === true &&
            estadoPermitido
          );

        })

      )

    );

  }

  // ========================================================
  // 4. APROBAR USUARIO
  // PUT /api/admin/aprobar/{id}
  // ========================================================

  aprobarUsuario(id: number): Observable<any> {
    return this.http.put(
      `${this.apiUrl}/aprobar/${id}`,
      {}
    );
  }

  // ========================================================
  // 5. RECHAZAR USUARIO
  // PUT /api/admin/rechazar/{id}
  // ========================================================

  rechazarUsuario(id: number): Observable<any> {
    return this.http.put(
      `${this.apiUrl}/rechazar/${id}`,
      {}
    );
  }

  // ========================================================
  // 6. BLOQUEAR USUARIO
  // PUT /api/admin/bloquear/{id}
  // ========================================================

  bloquearUsuario(id: number): Observable<any> {
    return this.http.put(
      `${this.apiUrl}/bloquear/${id}`,
      {}
    );
  }

  // ========================================================
  // 7. ACTIVAR USUARIO
  // PUT /api/admin/activar/{id}
  // ========================================================

  activarUsuario(id: number): Observable<any> {
    return this.http.put(
      `${this.apiUrl}/activar/${id}`,
      {}
    );
  }

  // ========================================================
  // 8. ELIMINAR USUARIO
  // DELETE /api/admin/usuarios/{id}
  // ========================================================

  eliminarUsuario(id: number): Observable<any> {
    return this.http.delete(
      `${this.apiUrl}/usuarios/${id}`
    );
  }

}
