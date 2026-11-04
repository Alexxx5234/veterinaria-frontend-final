// Injectable permite utilizar este servicio
// desde cualquier componente de Angular.
import { Injectable } from '@angular/core';

// HttpClient permite realizar peticiones HTTP
// hacia nuestra API de Spring Boot.
import { HttpClient } from '@angular/common/http';

// Observable permite manejar las respuestas
// que devuelve el backend.
import { Observable } from 'rxjs';


@Injectable({

  // Hace que este servicio esté disponible
  // en toda la aplicación.
  providedIn: 'root'

})
export class AdminUsuarioServicio {


  // ==========================================================
  // URL BASE
  // ==========================================================
  // Corresponde al AdminController de Spring Boot.

  private apiUrl =
    'http://100.110.172.31:8080/api/admin';



  // ==========================================================
  // CONSTRUCTOR
  // ==========================================================

  constructor(
    private http: HttpClient
  ) {}



  // ==========================================================
  // LISTAR TODOS LOS USUARIOS
  // ==========================================================
  //
  // GET:
  // /api/admin/usuarios
  // ==========================================================

  listarUsuarios(): Observable<any[]> {

    return this.http.get<any[]>(
      `${this.apiUrl}/usuarios`
    );

  }



  // ==========================================================
  // LISTAR USUARIOS PENDIENTES
  // ==========================================================
  //
  // GET:
  // /api/admin/usuarios-pendientes
  // ==========================================================

  listarPendientes(): Observable<any[]> {

    return this.http.get<any[]>(
      `${this.apiUrl}/usuarios-pendientes`
    );

  }



  // ==========================================================
  // APROBAR USUARIO
  // ==========================================================
  //
  // PUT:
  // /api/admin/aprobar/{id}
  // ==========================================================

  aprobarUsuario(
    id: number
  ): Observable<any> {

    return this.http.put(
      `${this.apiUrl}/aprobar/${id}`,
      {}
    );

  }



  // ==========================================================
  // RECHAZAR USUARIO
  // ==========================================================
  //
  // PUT:
  // /api/admin/rechazar/{id}
  // ==========================================================

  rechazarUsuario(
    id: number
  ): Observable<any> {

    return this.http.put(
      `${this.apiUrl}/rechazar/${id}`,
      {}
    );

  }



  // ==========================================================
  // BLOQUEAR USUARIO
  // ==========================================================
  //
  // PUT:
  // /api/admin/bloquear/{id}
  // ==========================================================

  bloquearUsuario(
    id: number
  ): Observable<any> {

    return this.http.put(
      `${this.apiUrl}/bloquear/${id}`,
      {}
    );

  }



  // ==========================================================
  // ACTIVAR USUARIO
  // ==========================================================
  //
  // PUT:
  // /api/admin/activar/{id}
  // ==========================================================

  activarUsuario(
    id: number
  ): Observable<any> {

    return this.http.put(
      `${this.apiUrl}/activar/${id}`,
      {}
    );

  }



  // ==========================================================
  // ELIMINAR USUARIO
  // ==========================================================
  //
  // DELETE:
  // /api/admin/usuarios/{id}
  // ==========================================================

  eliminarUsuario(
    id: number
  ): Observable<any> {

    return this.http.delete(
      `${this.apiUrl}/usuarios/${id}`
    );

  }

}