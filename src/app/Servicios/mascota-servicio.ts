import { environment } from '../../environments/environment';
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
// provenientes del backend.
import { Observable } from 'rxjs';


@Injectable({

  // El servicio estará disponible
  // para toda la aplicación.
  providedIn: 'root'

})
export class MascotaServicio {


  // ==========================================================
  // URL BASE
  // ==========================================================

  private apiUrl =
    environment.apiUrl + '/mascotas';


  // ==========================================================
  // CONSTRUCTOR
  // ==========================================================

  constructor(
    private http: HttpClient
  ) {}


  // ==========================================================
  // LISTAR TODAS LAS MASCOTAS
  // ==========================================================
  //
  // Solo ADMIN.
  //
  // GET:
  // /api/mascotas
  // ==========================================================

  listarTodasMascotas(): Observable<any[]> {

    return this.http.get<any[]>(
      this.apiUrl
    );

  }


  // ==========================================================
  // LISTAR MIS MASCOTAS
  // ==========================================================
  //
  // USER consulta solamente sus propias mascotas.
  //
  // GET:
  // /api/mascotas/mis-mascotas
  // ==========================================================

  listarMisMascotas(): Observable<any[]> {

    return this.http.get<any[]>(
      `${this.apiUrl}/mis-mascotas`
    );

  }


  // ==========================================================
  // BUSCAR MASCOTA POR ID
  // ==========================================================
  //
  // USER:
  // solamente si la mascota le pertenece.
  //
  // ADMIN:
  // puede consultar cualquier mascota.
  //
  // GET:
  // /api/mascotas/{id}
  // ==========================================================

  buscarPorId(
    id: number
  ): Observable<any> {

    return this.http.get<any>(
      `${this.apiUrl}/${id}`
    );

  }


  // ==========================================================
  // REGISTRAR MASCOTA
  // ==========================================================
  //
  // POST:
  // /api/mascotas
  //
  // Para USER, el backend obtiene el propietario
  // directamente desde el JWT.
  // ==========================================================

  registrarMascota(
    mascota: any
  ): Observable<any> {

    return this.http.post(
      this.apiUrl,
      mascota
    );

  }


  // ==========================================================
  // ACTUALIZAR MASCOTA
  // ==========================================================
  //
  // PUT:
  // /api/mascotas/{id}
  //
  // USER:
  // solamente puede editar una mascota propia.
  //
  // ADMIN:
  // puede editar cualquier mascota.
  // ==========================================================

  actualizarMascota(
    id: number,
    mascota: any
  ): Observable<any> {

    return this.http.put(
      `${this.apiUrl}/${id}`,
      mascota
    );

  }


  // ==========================================================
  // ELIMINAR MASCOTA
  // ==========================================================
  //
  // Solo ADMIN.
  //
  // DELETE:
  // /api/mascotas/{id}
  // ==========================================================

  eliminarMascota(
    id: number
  ): Observable<any> {

    return this.http.delete(
      `${this.apiUrl}/${id}`
    );

  }

}