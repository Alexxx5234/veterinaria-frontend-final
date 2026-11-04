
/* ==========================================================
   VETERINARIA AREVALO
   SERVICIO COMPARTIDO DE NOTIFICACIONES

   Permite enviar avisos desde diferentes componentes.
   ========================================================== */

import { Injectable } from '@angular/core';

import { BehaviorSubject } from 'rxjs';


// ==========================================================
// ESTRUCTURA DE UNA NOTIFICACIÓN
// ==========================================================

export interface AvisoSistema {

  id: number;

  titulo: string;

  mensaje: string;

  tipo: 'exito' | 'error' | 'info';

  fecha: string;

  leida: boolean;

}


// ==========================================================
// SERVICIO
// ==========================================================

@Injectable({
  providedIn: 'root'
})
export class NotificacionesServicio {

  // Lista de notificaciones de la sesión actual.
  private estado = new BehaviorSubject<AvisoSistema[]>([]);

  // Permite que el menú se actualice automáticamente.
  avisos$ = this.estado.asObservable();


  // ========================================================
  // AGREGAR UN AVISO
  // ========================================================

  agregar(
    titulo: string,
    mensaje: string,
    tipo: 'exito' | 'error' | 'info' = 'info'
  ): void {

    const nuevo: AvisoSistema = {

      id: Date.now(),

      titulo,

      mensaje,

      tipo,

      fecha: new Date().toLocaleTimeString(
        'es-EC',
        {
          hour: '2-digit',
          minute: '2-digit'
        }
      ),

      leida: false

    };

    // Agregamos el aviso al inicio de la lista.
    this.estado.next([

      nuevo,

      ...this.estado.value

    ].slice(0, 20));

  }


  // ========================================================
  // MARCAR COMO LEÍDAS
  // ========================================================

  marcarLeidas(): void {

    this.estado.next(

      this.estado.value.map(aviso => ({

        ...aviso,

        leida: true

      }))

    );

  }


  // ========================================================
  // LIMPIAR NOTIFICACIONES
  // ========================================================

  limpiar(): void {

    this.estado.next([]);

  }

}
