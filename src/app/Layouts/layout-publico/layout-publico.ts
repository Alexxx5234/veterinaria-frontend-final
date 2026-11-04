
/* ==========================================================
   VETERINARIA AREVALO
   LAYOUT PÚBLICO

   FUNCIONES:
   - Compartir la accesibilidad entre Login,
     Registro y Verificación de código.
   - Mantener los formularios originales.
   - Conservar las preferencias de accesibilidad.
   - Evitar que aparezcan dos botones ♿.

   IMPORTANTE:
   No utiliza JWT ni modifica la autenticación.
   ========================================================== */

// Permite crear un componente independiente.
import { Component } from '@angular/core';

// RouterOutlet muestra la página pública
// correspondiente a la ruta actual.
import { RouterOutlet } from '@angular/router';

// Panel de accesibilidad que ya construimos.
import { PanelAccesibilidad }
  from '../../Shared/panel-accesibilidad/panel-accesibilidad';


@Component({

  selector: 'app-layout-publico',

  standalone: true,

  imports: [
    RouterOutlet,
    PanelAccesibilidad
  ],

  templateUrl: './layout-publico.html',

  styleUrl: './layout-publico.scss'

})
export class LayoutPublico {

  // El componente funciona como contenedor.
  // No necesita manejar formularios ni llamadas HTTP.

}
