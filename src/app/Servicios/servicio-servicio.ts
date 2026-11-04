// ==========================================================
// IMPORTACIONES
// ==========================================================

// Injectable permite utilizar este servicio
// desde cualquier componente de Angular.
import { Injectable } from '@angular/core';

// HttpClient permite realizar peticiones HTTP
// hacia nuestra API REST de Spring Boot.
import { HttpClient } from '@angular/common/http';

// Observable permite manejar las respuestas
// obtenidas desde el backend.
import { Observable } from 'rxjs';


@Injectable({

  // Hace que este servicio esté disponible
  // en toda la aplicación Angular.
  providedIn: 'root'

})
export class ServicioServicio {


  // ==========================================================
  // URL BASE
  // ==========================================================
  // Corresponde al ServicioController de Spring Boot.

  private apiUrl =
    'http://100.110.172.31:8080/api/servicios';



  // ==========================================================
  // CONSTRUCTOR
  // ==========================================================

  constructor(
    private http: HttpClient
  ) {}



  // ==========================================================
  // LISTAR SERVICIOS
  // ==========================================================
  //
  // USER y ADMIN pueden consultar los servicios.
  //
  // GET:
  // /api/servicios
  // ==========================================================

  listarServicios(): Observable<any[]> {

    return this.http.get<any[]>(
      this.apiUrl
    );

  }



  // ==========================================================
  // BUSCAR SERVICIO POR ID
  // ==========================================================
  //
  // GET:
  // /api/servicios/{id}
  // ==========================================================

  buscarPorId(
    id: number
  ): Observable<any> {

    return this.http.get<any>(
      `${this.apiUrl}/${id}`
    );

  }



  // ==========================================================
  // CREAR SERVICIO
  // ==========================================================
  // Solo ADMIN.
  //
  // POST:
  // /api/servicios
  // ==========================================================

  crearServicio(
    servicio: any
  ): Observable<any> {

    return this.http.post(
      this.apiUrl,
      servicio
    );

  }



  // ==========================================================
  // ACTUALIZAR SERVICIO
  // ==========================================================
  // Solo ADMIN.
  //
  // PUT:
  // /api/servicios/{id}
  // ==========================================================

  actualizarServicio(
    id: number,
    servicio: any
  ): Observable<any> {

    return this.http.put(
      `${this.apiUrl}/${id}`,
      servicio
    );

  }



  // ==========================================================
  // ELIMINAR SERVICIO
  // ==========================================================
  // Solo ADMIN.
  //
  // DELETE:
  // /api/servicios/{id}
  // ==========================================================

  eliminarServicio(
    id: number
  ): Observable<any> {

    return this.http.delete(
      `${this.apiUrl}/${id}`
    );

  }

}