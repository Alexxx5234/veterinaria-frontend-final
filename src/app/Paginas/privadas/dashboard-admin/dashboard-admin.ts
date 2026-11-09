import { environment } from '../../../../environments/environment';

/* ==========================================================
   VETERINARIA ARÉVALO
   DASHBOARD DEL ADMINISTRADOR

   FUNCIONALIDADES:
   1. Consultar estadísticas generales.
   2. Contar usuarios por estado.
   3. Consultar mascotas registradas.
   4. Consultar veterinarios registrados.
   5. Consultar servicios disponibles.
   6. Consultar citas de hoy.
   7. Mostrar próximas citas.
   8. Consultar todas las facturas.
   9. Calcular facturas emitidas durante el día.
   10. Calcular el total facturado durante el día.
   11. Mostrar las últimas cinco facturas.
   12. Navegación a los módulos administrativos.

   SEGURIDAD:
   - Utiliza el JWT de la sesión actual.
   - El backend controla los permisos mediante roles.
   - La consulta global de facturas corresponde a ADMIN.

   ACCESIBILIDAD:
   - Etiquetas descriptivas.
   - Actualización manual.
   - Cierre de menú con Escape.
   - Compatibilidad con lectores de pantalla.
========================================================== */


// ==========================================================
// 1. IMPORTACIONES DE ANGULAR
// ==========================================================

import {
  Component,
  OnInit,
  ChangeDetectorRef,
  HostListener
} from '@angular/core';

import { CommonModule } from '@angular/common';


// ==========================================================
// 2. IMPORTACIONES HTTP
// ==========================================================

import {
  HttpClient,
  HttpHeaders
} from '@angular/common/http';


// ==========================================================
// 3. NAVEGACIÓN
// ==========================================================

import { Router } from '@angular/router';


// ==========================================================
// 4. PROGRAMACIÓN REACTIVA
// ==========================================================

import {
  forkJoin,
  of,
  Observable
} from 'rxjs';

import { catchError } from 'rxjs/operators';


// ==========================================================
// 5. SERVICIO DE AUTENTICACIÓN
// ==========================================================

import { AuthServicio } from '../../../Servicios/auth-servicio';


// ==========================================================
// 6. INTERFAZ DE USUARIOS
// ==========================================================

/*
  Representa los datos necesarios para calcular
  cuántos usuarios existen en cada estado.
*/

interface UsuarioResumen {
  estado?: string;
}


// ==========================================================
// 7. INTERFAZ DE CITAS
// ==========================================================

/*
  Representa una cita registrada en la clínica.

  Solo se utilizan los campos necesarios para
  presentar información en el dashboard.
*/

interface CitaResumen {

  id?: number;

  fechaHora?: string;

  estado?: string;

  mascota?: {
    nombre?: string;
  };

  servicio?: {
    nombre?: string;
  };

}


// ==========================================================
// 8. INTERFAZ DE FACTURAS
// ==========================================================

/*
  Estructura basada en la respuesta de facturación
  utilizada por el backend.

  Se permiten campos opcionales para evitar errores
  cuando un dato no esté disponible.
*/

interface FacturaResumen {

  id?: number;

  numeroFactura?: string;

  atencionId?: number;

  citaId?: number;

  nombreCliente?: string;

  correoCliente?: string;

  nombreMascota?: string;

  nombreVeterinario?: string;

  nombreServicio?: string;

  precioServicio?: number | string;

  medicamentos?: unknown[];

  totalMedicamentos?: number | string;

  subtotal?: number | string;

  impuestos?: number | string;

  total?: number | string;

  estado?: string;

  correoEnviado?: boolean;

  fechaCreacion?: string;

  fechaEmision?: string;

}


// ==========================================================
// 9. COMPONENTE ANGULAR
// ==========================================================

@Component({

  selector: 'app-dashboard-admin',

  standalone: true,

  imports: [
    CommonModule
  ],

  templateUrl: './dashboard-admin.html',

  styleUrl: './dashboard-admin.scss'

})

export class DashboardAdmin implements OnInit {


  // ========================================================
  // 10. CONFIGURACIÓN DE LA API
  // ========================================================

  /*
    Se conserva la dirección que utiliza actualmente
    tu proyecto para comunicarse con Spring Boot.

    Si posteriormente cambias de servidor,
    modifica únicamente esta dirección.
  */

  private readonly apiUrl =
    environment.apiUrl;


  // ========================================================
  // 11. CONTROL DEL MENÚ
  // ========================================================

  /*
    Se conserva esta propiedad para no perder
    compatibilidad con las funciones existentes.
  */

  menuAbierto: boolean = false;


  // ========================================================
  // 12. ESTADOS DE CARGA
  // ========================================================

  cargandoResumen: boolean = true;

  errorResumen: boolean = false;


  // Indica si se pudo consultar el módulo de facturas.
  consultaFacturasCorrecta: boolean = false;


  // ========================================================
  // 13. ESTADÍSTICAS GENERALES
  // ========================================================

  /*
    null = no se pudo consultar.
    0    = consulta correcta sin registros.
    > 0  = cantidad de registros encontrados.
  */

  totalUsuarios: number | null = null;

  totalMascotas: number | null = null;

  totalCitas: number | null = null;

  totalServicios: number | null = null;

  totalVeterinarios: number | null = null;


  // ========================================================
  // 14. ESTADÍSTICAS DE USUARIOS
  // ========================================================

  usuariosPendientes: number | null = null;

  usuariosAprobados: number | null = null;

  usuariosRechazados: number | null = null;

  usuariosBloqueados: number | null = null;


  // ========================================================
  // 15. ESTADÍSTICAS DE CITAS
  // ========================================================

  citasHoy: number | null = null;

  proximasCitas: CitaResumen[] = [];


  // ========================================================
  // 16. ESTADÍSTICAS DE FACTURACIÓN
  // ========================================================

  /*
    Los datos provienen de GET /api/facturas.

    El administrador consulta las facturas generales
    registradas en la veterinaria.
  */

  totalFacturas: number | null = null;

  facturasHoy: number | null = null;

  totalFacturadoHoy: number | null = null;


  // ========================================================
  // 17. ÚLTIMAS FACTURAS
  // ========================================================

  /*
    Se muestran las cinco facturas más recientes.

    El orden se determina mediante:
    1. Fecha de emisión.
    2. Fecha de creación, si no hay emisión.
  */

  ultimasFacturas: FacturaResumen[] = [];


  // ========================================================
  // 18. CONSTRUCTOR
  // ========================================================

  constructor(

    private router: Router,

    private authServicio: AuthServicio,

    private http: HttpClient,

    private cd: ChangeDetectorRef

  ) {}


  // ========================================================
  // 19. INICIALIZACIÓN
  // ========================================================

  ngOnInit(): void {

    /*
      Al entrar al dashboard se consultan
      automáticamente los datos de la clínica.
    */

    this.cargarResumen();

  }


  // ========================================================
  // 20. OBTENER HEADERS DE AUTENTICACIÓN
  // ========================================================

  private obtenerHeaders(): HttpHeaders {

    /*
      Recupera el JWT de la sesión actual.

      No se envía ningún rol manualmente.
      Spring Security identifica al usuario mediante
      el token y comprueba sus permisos.
    */

    const token = this.authServicio.obtenerToken();

    let headers = new HttpHeaders();

    if (token) {

      headers = headers.set(
        'Authorization',
        `Bearer ${token}`
      );

    }

    return headers;

  }


  // ========================================================
  // 21. CONSULTAR LISTAS DE SPRING BOOT
  // ========================================================

  /*
    Método reutilizable para consultar los diferentes
    módulos de la API.

    Si una petición falla, devuelve null y permite
    que las demás consultas continúen.
  */

  private consultarLista<T>(
    ruta: string
  ): Observable<T[] | null> {

    return this.http.get<T[]>(
      `${this.apiUrl}${ruta}`,
      {
        headers: this.obtenerHeaders()
      }

    ).pipe(

      catchError(error => {

        console.error(
          `Error consultando ${ruta}:`,
          error
        );

        return of(null);

      })

    );

  }


  // ========================================================
  // 22. CARGAR RESUMEN GENERAL
  // ========================================================

  cargarResumen(): void {

    this.cargandoResumen = true;

    this.errorResumen = false;

    this.consultaFacturasCorrecta = false;


    /*
      forkJoin permite ejecutar las consultas
      en paralelo y procesar sus respuestas juntas.

      No se bloquean los otros indicadores cuando
      un módulo presenta un error.
    */

    forkJoin({

      // -----------------------------------------------
      // USUARIOS
      // -----------------------------------------------

      usuarios:
        this.consultarLista<UsuarioResumen>(
          '/admin/usuarios'
        ),


      // -----------------------------------------------
      // MASCOTAS
      // -----------------------------------------------

      mascotas:
        this.consultarLista<unknown>(
          '/mascotas'
        ),


      // -----------------------------------------------
      // CITAS
      // -----------------------------------------------

      citas:
        this.consultarLista<CitaResumen>(
          '/citas'
        ),


      // -----------------------------------------------
      // SERVICIOS
      // -----------------------------------------------

      servicios:
        this.consultarLista<unknown>(
          '/servicios'
        ),


      // -----------------------------------------------
      // VETERINARIOS
      // -----------------------------------------------

      veterinarios:
        this.consultarLista<unknown>(
          '/veterinarios'
        ),


      // -----------------------------------------------
      // FACTURAS
      // -----------------------------------------------

      /*
        Endpoint administrativo existente.

        GET /api/facturas

        Devuelve las facturas generales
        para el administrador.
      */

      facturas:
        this.consultarLista<FacturaResumen>(
          '/facturas'
        )

    }).subscribe({

      // ==================================================
      // 23. PROCESAR RESPUESTAS
      // ==================================================

      next: datos => {

        // ================================================
        // 23.1. TOTALES GENERALES
        // ================================================

        this.totalUsuarios =
          datos.usuarios?.length ?? null;

        this.totalMascotas =
          datos.mascotas?.length ?? null;

        this.totalCitas =
          datos.citas?.length ?? null;

        this.totalServicios =
          datos.servicios?.length ?? null;

        this.totalVeterinarios =
          datos.veterinarios?.length ?? null;


        // ================================================
        // 23.2. ESTADOS DE USUARIOS
        // ================================================

        if (datos.usuarios !== null) {

          const usuarios = datos.usuarios;

          /*
            Se admiten las variantes singular/plural
            de los estados para evitar que una diferencia
            en el nombre deje los contadores en cero.
          */

          this.usuariosPendientes =
            usuarios.filter(u =>
              this.normalizarEstado(u.estado) === 'PENDIENTE'
            ).length;


          this.usuariosAprobados =
            usuarios.filter(u => {

              const estado =
                this.normalizarEstado(u.estado);

              return [
                'APROBADO',
                'APROBADA'
              ].includes(estado);

            }).length;


          this.usuariosRechazados =
            usuarios.filter(u => {

              const estado =
                this.normalizarEstado(u.estado);

              return [
                'RECHAZADO',
                'RECHAZADA'
              ].includes(estado);

            }).length;


          this.usuariosBloqueados =
            usuarios.filter(u => {

              const estado =
                this.normalizarEstado(u.estado);

              return [
                'BLOQUEADO',
                'BLOQUEADA'
              ].includes(estado);

            }).length;

        } else {

          this.usuariosPendientes = null;

          this.usuariosAprobados = null;

          this.usuariosRechazados = null;

          this.usuariosBloqueados = null;

        }


        // ================================================
        // 23.3. ESTADÍSTICAS DE CITAS
        // ================================================

        if (datos.citas !== null) {

          const ahora = new Date();


          // Contar citas de hoy.
          // Las citas canceladas no se incluyen.

          this.citasHoy = datos.citas.filter(cita => {

            if (
              !cita.fechaHora ||
              this.normalizarEstado(cita.estado) === 'CANCELADA'
            ) {

              return false;

            }

            return this.esMismaFecha(
              new Date(cita.fechaHora),
              ahora
            );

          }).length;


          // Obtener las próximas citas.

          this.proximasCitas = datos.citas

            .filter(cita => {

              if (
                !cita.fechaHora ||
                this.normalizarEstado(cita.estado) === 'CANCELADA'
              ) {

                return false;

              }

              const fecha = new Date(cita.fechaHora);

              return (
                !isNaN(fecha.getTime()) &&
                fecha.getTime() >= ahora.getTime()
              );

            })

            // Ordenar de la más próxima a la más lejana.
            .sort((a, b) =>

              new Date(a.fechaHora!).getTime() -
              new Date(b.fechaHora!).getTime()

            )

            // Mostrar cuatro citas en el dashboard.
            .slice(0, 4);

        } else {

          this.citasHoy = null;

          this.proximasCitas = [];

        }


        // ================================================
        // 23.4. ESTADÍSTICAS DE FACTURACIÓN
        // ================================================

        if (datos.facturas !== null) {

          const facturas = datos.facturas;

          const hoy = new Date();


          // Total de facturas existentes.

          this.totalFacturas = facturas.length;


          // Contar facturas emitidas durante el día.

          this.facturasHoy = facturas.filter(factura => {

            const fecha =
              this.obtenerFechaFactura(factura);

            return fecha !== null &&
              this.esMismaFecha(fecha, hoy);

          }).length;


          // ==============================================
          // TOTAL FACTURADO DURANTE EL DÍA
          // ==============================================

          /*
            Se suman los totales de las facturas
            correspondientes a la fecha actual.

            Se excluyen documentos anulados o cancelados
            si el backend devuelve alguno con esos estados.

            Este indicador representa lo facturado,
            no necesariamente dinero cobrado en caja.
          */

          this.totalFacturadoHoy = facturas

            .filter(factura => {

              const fecha =
                this.obtenerFechaFactura(factura);

              return (
                fecha !== null &&
                this.esMismaFecha(fecha, hoy) &&
                this.facturaCuentaParaTotal(factura)
              );

            })

            .reduce((acumulado, factura) => {

              return acumulado +
                this.normalizarMonto(factura.total);

            }, 0);


          // ==============================================
          // 23.5. ÚLTIMAS CINCO FACTURAS
          // ==============================================

          this.ultimasFacturas = [...facturas]

            .sort((a, b) => {

              const fechaA =
                this.obtenerFechaFactura(a)?.getTime() ?? 0;

              const fechaB =
                this.obtenerFechaFactura(b)?.getTime() ?? 0;

              return fechaB - fechaA;

            })

            .slice(0, 5);


          this.consultaFacturasCorrecta = true;

        } else {

          // La consulta falló: no mostrar valores falsos.

          this.totalFacturas = null;

          this.facturasHoy = null;

          this.totalFacturadoHoy = null;

          this.ultimasFacturas = [];

          this.consultaFacturasCorrecta = false;

        }


        // ================================================
        // 23.6. COMPROBAR ERRORES PARCIALES
        // ================================================

        /*
          Si una consulta falla, se informa al administrador.
          Los demás indicadores conservan sus resultados.
        */

        this.errorResumen = [

          datos.usuarios,

          datos.mascotas,

          datos.citas,

          datos.servicios,

          datos.veterinarios,

          datos.facturas

        ].some(resultado => resultado === null);


        // ================================================
        // 23.7. FINALIZAR CARGA
        // ================================================

        this.cargandoResumen = false;

        this.cd.detectChanges();

      },


      // ==================================================
      // 24. ERROR GENERAL
      // ==================================================

      error: error => {

        console.error(
          'Error general del dashboard ADMIN:',
          error
        );

        this.cargandoResumen = false;

        this.errorResumen = true;

        this.cd.detectChanges();

      }

    });

  }


  // ========================================================
  // 25. NORMALIZAR ESTADOS
  // ========================================================

  /*
    Evita problemas por espacios o diferencias
    entre mayúsculas y minúsculas.
  */

  private normalizarEstado(
    estado?: string
  ): string {

    return (estado ?? '')
      .trim()
      .toUpperCase();

  }


  // ========================================================
  // 26. OBTENER FECHA DE UNA FACTURA
  // ========================================================

  /*
    Primero utiliza fechaEmision.
    Si no está disponible, utiliza fechaCreacion.
  */

  private obtenerFechaFactura(
    factura: FacturaResumen
  ): Date | null {

    const valor =
      factura.fechaEmision ||
      factura.fechaCreacion;

    if (!valor) {
      return null;
    }

    const fecha = new Date(valor);

    if (isNaN(fecha.getTime())) {
      return null;
    }

    return fecha;

  }


  // ========================================================
  // 27. COMPARAR FECHAS
  // ========================================================

  /*
    Compara día, mes y año según la fecha local
    del navegador.
  */

  private esMismaFecha(
    fecha: Date,
    referencia: Date
  ): boolean {

    if (isNaN(fecha.getTime())) {
      return false;
    }

    return (

      fecha.getDate() === referencia.getDate() &&

      fecha.getMonth() === referencia.getMonth() &&

      fecha.getFullYear() === referencia.getFullYear()

    );

  }


  // ========================================================
  // 28. NORMALIZAR VALORES MONETARIOS
  // ========================================================

  /*
    Permite trabajar con valores recibidos como:
    - 25
    - 25.50
    - "25.50"
    - "$25.50"

    Los valores inválidos se convierten en cero.
  */

  private normalizarMonto(
    valor?: number | string
  ): number {

    if (typeof valor === 'number') {

      return Number.isFinite(valor) ? valor : 0;

    }

    if (typeof valor !== 'string' || !valor.trim()) {

      return 0;

    }

    let limpio = valor
      .trim()
      .replace(/[^\d,.-]/g, '');

    if (
      limpio.includes(',') &&
      limpio.includes('.')
    ) {

      limpio = limpio.replace(/,/g, '');

    } else if (limpio.includes(',')) {

      limpio = limpio.replace(',', '.');

    }

    const resultado = Number(limpio);

    return Number.isFinite(resultado)
      ? resultado
      : 0;

  }


  // ========================================================
  // 29. COMPROBAR SI UNA FACTURA CUENTA PARA EL TOTAL
  // ========================================================

  /*
    Las facturas anuladas o canceladas no se suman
    al indicador de facturación diaria.
  */

  private facturaCuentaParaTotal(
    factura: FacturaResumen
  ): boolean {

    const estado =
      this.normalizarEstado(factura.estado);

    return ![
      'ANULADA',
      'ANULADO',
      'CANCELADA',
      'CANCELADO'
    ].includes(estado);

  }


  // ========================================================
  // 30. ABRIR Y CERRAR MENÚ
  // ========================================================

  cambiarMenu(): void {

    this.menuAbierto = !this.menuAbierto;

  }


  cerrarMenu(): void {

    this.menuAbierto = false;

  }


  // ========================================================
  // 31. CERRAR MENÚ CON ESCAPE
  // ========================================================

  @HostListener('document:keydown.escape')
  cerrarMenuConEscape(): void {

    this.cerrarMenu();

  }


  // ========================================================
  // 32. MÉTODO GENERAL DE NAVEGACIÓN
  // ========================================================

  /*
    Centraliza la navegación y cierra el menú
    antes de cambiar de pantalla.
  */

  private navegar(ruta: string): void {

    this.cerrarMenu();

    void this.router.navigateByUrl(ruta);

  }


  // ========================================================
  // 33. NAVEGACIÓN ADMINISTRATIVA
  // ========================================================

  irInicio(): void {

    this.navegar('/admin/dashboard');

  }


  irUsuarios(): void {

    this.navegar('/admin/usuarios');

  }


  irMascotas(): void {

    this.navegar('/admin/mascotas');

  }


  irCitas(): void {

    this.navegar('/admin/citas');

  }


  irServicios(): void {

    this.navegar('/admin/servicios');

  }


  irVeterinarios(): void {

    this.navegar('/admin/veterinarios');

  }


  // ========================================================
  // 34. CERRAR SESIÓN
  // ========================================================

  /*
    Elimina la sesión autenticada y regresa
    a la pantalla de inicio de sesión.
  */

  cerrarSesion(): void {

    this.cerrarMenu();

    this.authServicio.cerrarSesion();

    void this.router.navigateByUrl('/login');

  }

}
