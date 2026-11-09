import { environment } from '../../environments/environment';
// ==========================================================
// IMPORTACIONES
// ==========================================================

// Injectable permite utilizar este servicio
// desde cualquier componente de Angular.
import { Injectable } from '@angular/core';

// HttpClient permite realizar peticiones HTTP
// hacia la API REST de Spring Boot.
import { HttpClient } from '@angular/common/http';

// Observable permite manejar las respuestas
// recibidas desde el backend.
import { Observable } from 'rxjs';


@Injectable({

  // Disponible para toda la aplicación.
  providedIn: 'root'

})
export class CitaServicio {


  // ==========================================================
  // URL BASE
  // ==========================================================

  private apiUrl =
    environment.apiUrl + '/citas';


  // ==========================================================
  // CONSTRUCTOR
  // ==========================================================

  constructor(
    private http: HttpClient
  ) {}


  // ==========================================================
  // LISTAR TODAS LAS CITAS
  // ==========================================================
  //
  // Solo ADMIN.
  //
  // GET:
  // /api/citas
  // ==========================================================

  listarTodasCitas(): Observable<any[]> {

    return this.http.get<any[]>(
      this.apiUrl
    );

  }


  // ==========================================================
  // LISTAR MIS CITAS
  // ==========================================================
  //
  // USER consulta las citas asociadas
  // a sus propias mascotas.
  //
  // GET:
  // /api/citas/mis-citas
  // ==========================================================

  listarMisCitas(): Observable<any[]> {

    return this.http.get<any[]>(
      `${this.apiUrl}/mis-citas`
    );

  }


  // ==========================================================
  // BUSCAR CITA POR ID
  // ==========================================================
  //
  // GET:
  // /api/citas/{id}
  // ==========================================================

  buscarPorId(
    id: number
  ): Observable<any> {

    return this.http.get<any>(
      `${this.apiUrl}/${id}`
    );

  }


  // ==========================================================
  // CREAR CITA
  // ==========================================================
  //
  // USER:
  // solamente para una mascota propia.
  //
  // ADMIN:
  // para cualquier mascota.
  //
  // POST:
  // /api/citas
  // ==========================================================

  crearCita(
    cita: any
  ): Observable<any> {

    return this.http.post(
      this.apiUrl,
      cita
    );

  }


  // ==========================================================
  // ACTUALIZAR CITA
  // ==========================================================
  //
  // PUT:
  // /api/citas/{id}
  //
  // ADMIN también puede modificar
  // libremente el estado de la cita.
  // ==========================================================

  actualizarCita(
    id: number,
    cita: any
  ): Observable<any> {

    return this.http.put(
      `${this.apiUrl}/${id}`,
      cita
    );

  }


  // ==========================================================
  // CANCELAR CITA
  // ==========================================================
  //
  // No elimina la cita.
  //
  // Cambia su estado a:
  // CANCELADA
  //
  // PUT:
  // /api/citas/{id}/cancelar
  // ==========================================================

  cancelarCita(
    id: number
  ): Observable<any> {

    return this.http.put(
      `${this.apiUrl}/${id}/cancelar`,
      {}
    );

  }


  // ==========================================================
  // ELIMINAR CITA
  // ==========================================================
  //
  // Solo ADMIN.
  //
  // La cita se elimina definitivamente
  // de la base de datos.
  //
  // DELETE:
  // /api/citas/{id}
  // ==========================================================

  eliminarCita(
    id: number
  ): Observable<any> {

    return this.http.delete(
      `${this.apiUrl}/${id}`
    );

  }

}