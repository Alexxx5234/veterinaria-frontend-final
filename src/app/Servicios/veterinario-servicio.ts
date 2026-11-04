// ==========================================================
// IMPORTACIONES
// ==========================================================

// Injectable permite usar este servicio
// desde cualquier componente Angular.
import { Injectable } from '@angular/core';

// HttpClient permite realizar peticiones HTTP
// hacia el backend de Spring Boot.
import { HttpClient } from '@angular/common/http';

// Observable permite manejar las respuestas
// que devuelve la API.
import { Observable } from 'rxjs';


@Injectable({
  providedIn: 'root'
})
export class VeterinarioServicio {


  // ==========================================================
  // URL BASE
  // ==========================================================

  private apiUrl =
    'http://100.110.172.31:8080/api/veterinarios';


  // ==========================================================
  // CONSTRUCTOR
  // ==========================================================

  constructor(
    private http: HttpClient
  ) {}


  // ==========================================================
  // LISTAR VETERINARIOS
  // ==========================================================
  //
  // USER y ADMIN pueden consultar veterinarios.
  //
  // GET:
  // /api/veterinarios
  // ==========================================================

  listarVeterinarios(): Observable<any[]> {

    return this.http.get<any[]>(
      this.apiUrl
    );

  }


  // ==========================================================
  // BUSCAR VETERINARIO POR ID
  // ==========================================================
  //
  // GET:
  // /api/veterinarios/{id}
  // ==========================================================

  buscarPorId(
    id: number
  ): Observable<any> {

    return this.http.get<any>(
      `${this.apiUrl}/${id}`
    );

  }


  // ==========================================================
  // CREAR VETERINARIO
  // ==========================================================
  //
  // Solo ADMIN.
  //
  // POST:
  // /api/veterinarios
  // ==========================================================

  crearVeterinario(
    veterinario: any
  ): Observable<any> {

    return this.http.post(
      this.apiUrl,
      veterinario
    );

  }


  // ==========================================================
  // ACTUALIZAR VETERINARIO
  // ==========================================================
  //
  // Solo ADMIN.
  //
  // PUT:
  // /api/veterinarios/{id}
  // ==========================================================

  actualizarVeterinario(
    id: number,
    veterinario: any
  ): Observable<any> {

    return this.http.put(
      `${this.apiUrl}/${id}`,
      veterinario
    );

  }


  // ==========================================================
  // ELIMINAR VETERINARIO
  // ==========================================================
  //
  // Solo ADMIN.
  //
  // DELETE:
  // /api/veterinarios/{id}
  // ==========================================================

  eliminarVeterinario(
    id: number
  ): Observable<any> {

    return this.http.delete(
      `${this.apiUrl}/${id}`
    );

  }

}