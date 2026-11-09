import { environment } from '../../environments/environment';

/* ==========================================================
   VETERINARIA ARÉVALO
   SERVICIO DE ADMINISTRACIÓN DE VETERINARIOS

   FUNCIONES:
   1. Listar veterinarios.
   2. Consultar veterinario por ID.
   3. Registrar veterinario desde usuario existente.
   4. Actualizar datos profesionales.
   5. Eliminar ficha profesional.

   INTEGRACIÓN:
   - Angular utiliza HttpClient.
   - Spring Boot administra los datos.
   - La autenticación JWT se gestiona mediante
     el interceptor HTTP configurado en la aplicación.

   IMPORTANTE:
   El nuevo registro utiliza /desde-usuario.
   No crea una segunda cuenta.
   ========================================================== */


// ==========================================================
// 1. IMPORTACIONES
// ==========================================================

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';


// ==========================================================
// 2. INTERFAZ PARA REGISTRAR DESDE UN USUARIO EXISTENTE
// ==========================================================

/*
  Estos son los únicos datos que necesita el backend
  para crear una ficha profesional desde una cuenta existente.

  El nombre y correo se obtienen automáticamente
  de la cuenta seleccionada.
*/

export interface RegistroVeterinarioDesdeUsuario {

  usuarioId: number;

  cedula: string;

  especialidad: string;

  telefono: string;

}


// ==========================================================
// 3. INTERFAZ PRINCIPAL DEL VETERINARIO
// ==========================================================

/*
  Representa la información que devuelve Spring Boot.

  Se mantiene apellido como string para evitar
  incompatibilidades con interfaces del componente
  administrativo que esperan ese campo obligatorio.
*/

export interface Veterinario {

  id: number;

  cedula: string;

  nombre: string;

  apellido: string;

  especialidad: string;

  telefono: string;

  email: string;

}


// ==========================================================
// 4. INTERFAZ PARA ACTUALIZAR DATOS PROFESIONALES
// ==========================================================

/*
  Permite actualizar los datos de la ficha sin
  obligar a enviar todos los campos en cada operación.

  La relación con el usuario no se modifica desde aquí.
*/

export type ActualizarVeterinario =
  Partial<Omit<Veterinario, 'id'>>;


// ==========================================================
// 5. SERVICIO PRINCIPAL
// ==========================================================

@Injectable({
  providedIn: 'root'
})

export class VeterinarioServicio {


  // ========================================================
  // 5.1. DIRECCIÓN BASE DE LA API
  // ========================================================

  /*
    Dirección actual del backend Spring Boot.

    Puerto: 8080
    Contexto: /api
    Controlador: /veterinarios
  */

  private readonly apiUrl =
    environment.apiUrl + '/veterinarios';


  // ========================================================
  // 5.2. CONSTRUCTOR
  // ========================================================

  constructor(
    private readonly http: HttpClient
  ) {}


  // ========================================================
  // 6. LISTAR TODOS LOS VETERINARIOS
  // ========================================================

  /*
    MÉTODO HTTP: GET

    ENDPOINT:
    /api/veterinarios

    DESCRIPCIÓN:
    Obtiene el listado de profesionales registrados.

    RESPUESTA:
    Array de veterinarios.
  */

  listarVeterinarios(): Observable<Veterinario[]> {

    return this.http.get<Veterinario[]>(
      this.apiUrl
    );

  }


  // ========================================================
  // 7. CONSULTAR VETERINARIO POR ID
  // ========================================================

  /*
    MÉTODO HTTP: GET

    ENDPOINT:
    /api/veterinarios/{id}

    DESCRIPCIÓN:
    Busca un profesional mediante su identificador.
  */

  buscarPorId(
    id: number
  ): Observable<Veterinario> {

    return this.http.get<Veterinario>(
      `${this.apiUrl}/${id}`
    );

  }


  // ========================================================
  // 8. REGISTRAR VETERINARIO DESDE USUARIO EXISTENTE
  // ========================================================

  /*
    MÉTODO HTTP: POST

    ENDPOINT:
    /api/veterinarios/desde-usuario

    SOLO ADMIN.

    DATOS ENVIADOS:
    - usuarioId
    - cedula
    - especialidad
    - telefono

    SPRING BOOT REALIZA:
    1. Busca la cuenta seleccionada.
    2. Comprueba que el correo esté verificado.
    3. Comprueba que el rol actual sea USER.
    4. Comprueba que no exista otra ficha.
    5. Crea la ficha profesional.
    6. Vincula la cuenta existente.
    7. Asigna el rol VETERINARIO.
    8. Aprueba y activa la cuenta.

    NO SE CREA UNA SEGUNDA CUENTA.
    NO SE CAMBIA LA CONTRASEÑA ORIGINAL.
  */

  registrarDesdeUsuario(
    datos: RegistroVeterinarioDesdeUsuario
  ): Observable<Veterinario> {

    return this.http.post<Veterinario>(
      `${this.apiUrl}/desde-usuario`,
      datos
    );

  }


  // ========================================================
  // 9. REGISTRO ANTIGUO DE VETERINARIO
  // ========================================================

  /*
    MÉTODO HTTP: POST

    ENDPOINT:
    /api/veterinarios

    Se conserva por compatibilidad con operaciones
    anteriores del proyecto.

    IMPORTANTE:
    No utilizar en el nuevo formulario administrativo.

    El registro recomendado es registrarDesdeUsuario().
  */

  crearVeterinario(
    veterinario: Partial<Veterinario>
  ): Observable<Veterinario> {

    return this.http.post<Veterinario>(
      this.apiUrl,
      veterinario
    );

  }


  // ========================================================
  // 10. ACTUALIZAR DATOS DEL VETERINARIO
  // ========================================================

  /*
    MÉTODO HTTP: PUT

    ENDPOINT:
    /api/veterinarios/{id}

    DESCRIPCIÓN:
    Actualiza los datos de la ficha profesional.

    IMPORTANTE:
    El backend debe conservar la relación usuario_id.
    No se cambia el correo ni la contraseña de la cuenta
    mediante este servicio.
  */

  actualizarVeterinario(
    id: number,
    veterinario: ActualizarVeterinario
  ): Observable<Veterinario> {

    return this.http.put<Veterinario>(
      `${this.apiUrl}/${id}`,
      veterinario
    );

  }


  // ========================================================
  // 11. ELIMINAR FICHA PROFESIONAL
  // ========================================================

  /*
    MÉTODO HTTP: DELETE

    ENDPOINT:
    /api/veterinarios/{id}

    DESCRIPCIÓN:
    Solicita al backend eliminar la ficha profesional.

    PROTECCIONES DEL BACKEND:
    - No permite eliminar veterinarios con citas asociadas.
    - Si la eliminación es válida, devuelve la cuenta
      vinculada al rol USER.
    - Conserva la contraseña original.

    La decisión final corresponde a Spring Boot.
  */

  eliminarVeterinario(
    id: number
  ): Observable<unknown> {

    return this.http.delete(
      `${this.apiUrl}/${id}`
    );

  }

}
