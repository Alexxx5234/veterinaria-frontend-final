import { environment } from '../../../../environments/environment';

/* ==========================================================
   VETERINARIA ARÉVALO
   MÓDULO: MEDICAMENTOS DISPONIBLES
   ROL: VETERINARIO

   FUNCIONALIDADES:
   1. Consultar catálogo de medicamentos.
   2. Visualizar precios y existencias.
   3. Buscar por nombre, ID, presentación y concentración.
   4. Filtrar por estado.
   5. Ordenar alfabéticamente.
   6. Ordenar por menor o mayor precio.
   7. Ordenar por menor o mayor stock.
   8. Mostrar estadísticas del catálogo.
   9. Limpiar filtros y ordenamiento.
   10. Manejar errores de conexión.

   SEGURIDAD:
   El veterinario solo puede consultar.
   ADMIN mantiene el control del inventario.

   IMPORTANTE:
   No modifica medicamentos ni existencias.
========================================================== */

// ==========================================================
// 1. IMPORTACIONES
// ==========================================================

import {
  Component,
  ChangeDetectorRef,
  OnInit
} from '@angular/core';

import { CommonModule } from '@angular/common';

import {
  HttpClient,
  HttpHeaders
} from '@angular/common/http';

import { timeout } from 'rxjs/operators';

import { AuthServicio }
  from '../../../Servicios/auth-servicio';


// ==========================================================
// 2. TIPOS DE FILTROS
// ==========================================================

type FiltroMedicamento =
  | 'TODOS'
  | 'ACTIVOS'
  | 'INACTIVOS'
  | 'DISPONIBLES'
  | 'AGOTADOS';


// ==========================================================
// 3. TIPOS DE ORDENAMIENTO
// ==========================================================

type OrdenMedicamento =
  | 'NOMBRE_ASC'
  | 'NOMBRE_DESC'
  | 'PRECIO_ASC'
  | 'PRECIO_DESC'
  | 'STOCK_ASC'
  | 'STOCK_DESC';


// ==========================================================
// 4. INTERFAZ DEL MEDICAMENTO
// ==========================================================

interface MedicamentoCatalogo {

  id: number;

  nombre: string;

  descripcion?: string | null;

  presentacion?: string | null;

  concentracion?: string | null;

  unidadMedida?: string | null;

  stockDisponible?: number | string | null;

  precioUnitario?: number | string | null;

  activo?: boolean;

}


// ==========================================================
// 5. COMPONENTE PRINCIPAL
// ==========================================================

@Component({

  selector: 'app-medicamentos-disponibles-veterinario',

  standalone: true,

  imports: [
    CommonModule
  ],

  templateUrl:
    './medicamentos-disponibles-veterinario.html',

  styleUrl:
    './medicamentos-disponibles-veterinario.scss'

})

export class MedicamentosDisponiblesVeterinario
  implements OnInit {


  // ========================================================
  // 6. CONFIGURACIÓN DEL BACKEND
  // ========================================================

  private readonly apiUrl =
    environment.apiUrl;

  private readonly tiempoMaximo = 20000;


  // ========================================================
  // 7. LISTADO DE MEDICAMENTOS
  // ========================================================

  medicamentos: MedicamentoCatalogo[] = [];


  // ========================================================
  // 8. ESTADOS DE LA PÁGINA
  // ========================================================

  cargando = false;

  error = '';


  // ========================================================
  // 9. BUSCADOR Y FILTROS
  // ========================================================

  busqueda = '';

  filtro: FiltroMedicamento = 'TODOS';


  // ========================================================
  // 10. NUEVO: ORDENAMIENTO
  // ========================================================

  ordenarPor: OrdenMedicamento = 'NOMBRE_ASC';


  // ========================================================
  // 11. CONSTRUCTOR
  // ========================================================

  constructor(

    private http: HttpClient,

    private authServicio: AuthServicio,

    private cd: ChangeDetectorRef

  ) {}


  // ========================================================
  // 12. INICIALIZACIÓN
  // ========================================================

  ngOnInit(): void {

    this.cargarMedicamentos();

  }


  // ========================================================
  // 13. AUTENTICACIÓN JWT
  // ========================================================

  private obtenerHeaders(): HttpHeaders {

    const token =
      this.authServicio.obtenerToken();

    return token

      ? new HttpHeaders({
          Authorization: `Bearer ${token}`
        })

      : new HttpHeaders();

  }


  // ========================================================
  // 14. CONSULTAR MEDICAMENTOS
  //
  // GET /api/medicamentos
  // ========================================================

  cargarMedicamentos(): void {

    if (this.cargando) {
      return;
    }

    this.cargando = true;

    this.error = '';

    this.http.get<MedicamentoCatalogo[]>(

      `${this.apiUrl}/medicamentos`,

      {
        headers: this.obtenerHeaders()
      }

    ).pipe(

      timeout(this.tiempoMaximo)

    ).subscribe({

      next: respuesta => {

        if (!Array.isArray(respuesta)) {

          this.medicamentos = [];

          this.error =
            'El servidor no devolvió un catálogo válido.';

        } else {

          // Evitar registros incompletos.
          // No se elimina información de PostgreSQL.

          this.medicamentos = respuesta

            .filter(medicamento =>

              medicamento != null &&

              Number(medicamento.id) > 0 &&

              String(
                medicamento.nombre ?? ''
              ).trim() !== ''

            )

            .sort((a, b) =>

              this.compararNombres(
                a.nombre,
                b.nombre
              )

            );

        }

        this.cargando = false;

        this.cd.detectChanges();

      },

      error: error => {

        console.error(
          'Error consultando medicamentos:',
          error
        );

        this.medicamentos = [];

        this.error =
          this.obtenerMensajeError(error);

        this.cargando = false;

        this.cd.detectChanges();

      }

    });

  }


  // ========================================================
  // 15. ESTADÍSTICAS
  // ========================================================

  get totalActivos(): number {

    return this.medicamentos.filter(
      m => m.activo === true
    ).length;

  }


  get totalInactivos(): number {

    return this.medicamentos.filter(
      m => m.activo === false
    ).length;

  }


  get totalDisponibles(): number {

    return this.medicamentos.filter(m => {

      const stock =
        this.obtenerStock(m);

      return (
        m.activo === true &&
        stock !== null &&
        stock > 0
      );

    }).length;

  }


  get totalAgotados(): number {

    return this.medicamentos.filter(m => {

      const stock =
        this.obtenerStock(m);

      return (
        m.activo === true &&
        stock !== null &&
        stock <= 0
      );

    }).length;

  }


  // ========================================================
  // 16. BUSCAR, FILTRAR Y ORDENAR
  //
  // Primero:
  // 1. Filtrar por texto.
  // 2. Filtrar por estado.
  //
  // Después:
  // 3. Ordenar según la opción seleccionada.
  // ========================================================

  get medicamentosFiltrados(): MedicamentoCatalogo[] {

    const termino =
      this.normalizar(this.busqueda);


    // ------------------------------------------------------
    // PASO 1: APLICAR BÚSQUEDA Y ESTADO
    // ------------------------------------------------------

    const resultado = this.medicamentos.filter(

      medicamento => {

        const texto = this.normalizar([

          medicamento.id,

          medicamento.nombre,

          medicamento.descripcion,

          medicamento.presentacion,

          medicamento.concentracion,

          medicamento.unidadMedida

        ].join(' '));


        const coincideBusqueda =

          !termino ||

          texto.includes(termino);


        const stock =
          this.obtenerStock(medicamento);


        let coincideEstado = true;


        switch (this.filtro) {

          case 'ACTIVOS':

            coincideEstado =
              medicamento.activo === true;

            break;


          case 'INACTIVOS':

            coincideEstado =
              medicamento.activo === false;

            break;


          case 'DISPONIBLES':

            coincideEstado =

              medicamento.activo === true &&

              stock !== null &&

              stock > 0;

            break;


          case 'AGOTADOS':

            coincideEstado =

              medicamento.activo === true &&

              stock !== null &&

              stock <= 0;

            break;


          default:

            coincideEstado = true;

        }


        return (
          coincideBusqueda &&
          coincideEstado
        );

      }

    );


    // ------------------------------------------------------
    // PASO 2: ORDENAR RESULTADOS
    // ------------------------------------------------------

    // Utilizamos una copia.
    // No modificamos el catálogo original.

    return [...resultado].sort((a, b) => {

      switch (this.ordenarPor) {


        // ==================================================
        // NOMBRE A - Z
        // ==================================================

        case 'NOMBRE_ASC':

          return this.compararNombres(
            a.nombre,
            b.nombre
          );


        // ==================================================
        // NOMBRE Z - A
        // ==================================================

        case 'NOMBRE_DESC':

          return this.compararNombres(
            b.nombre,
            a.nombre
          );


        // ==================================================
        // MENOR PRECIO PRIMERO
        // ==================================================

        case 'PRECIO_ASC':

          return this.compararValores(
            this.obtenerPrecio(a),
            this.obtenerPrecio(b),
            true,
            a.nombre,
            b.nombre
          );


        // ==================================================
        // MAYOR PRECIO PRIMERO
        // ==================================================

        case 'PRECIO_DESC':

          return this.compararValores(
            this.obtenerPrecio(a),
            this.obtenerPrecio(b),
            false,
            a.nombre,
            b.nombre
          );


        // ==================================================
        // MENOR STOCK PRIMERO
        // ==================================================

        case 'STOCK_ASC':

          return this.compararValores(
            this.obtenerStock(a),
            this.obtenerStock(b),
            true,
            a.nombre,
            b.nombre
          );


        // ==================================================
        // MAYOR STOCK PRIMERO
        // ==================================================

        case 'STOCK_DESC':

          return this.compararValores(
            this.obtenerStock(a),
            this.obtenerStock(b),
            false,
            a.nombre,
            b.nombre
          );


        default:

          return this.compararNombres(
            a.nombre,
            b.nombre
          );

      }

    });

  }


  // ========================================================
  // 17. COMPARAR NOMBRES ALFABÉTICAMENTE
  // ========================================================

  private compararNombres(
    primero: string,
    segundo: string
  ): number {

    return String(primero ?? '').localeCompare(

      String(segundo ?? ''),

      'es',

      {
        sensitivity: 'base',
        numeric: true
      }

    );

  }


  // ========================================================
  // 18. COMPARAR PRECIO O STOCK
  //
  // ascendente = true:
  // menor -> mayor.
  //
  // ascendente = false:
  // mayor -> menor.
  //
  // Valores sin información quedan al final.
  // ========================================================

  private compararValores(

    valorA: number | null,

    valorB: number | null,

    ascendente: boolean,

    nombreA: string,

    nombreB: string

  ): number {


    // Ambos sin información.
    if (valorA === null && valorB === null) {

      return this.compararNombres(
        nombreA,
        nombreB
      );

    }


    // No informado siempre al final.
    if (valorA === null) {
      return 1;
    }

    if (valorB === null) {
      return -1;
    }


    // Comparación numérica.
    const diferencia = ascendente

      ? valorA - valorB

      : valorB - valorA;


    // Si tienen el mismo valor,
    // ordenar alfabéticamente.
    return diferencia !== 0

      ? diferencia

      : this.compararNombres(
          nombreA,
          nombreB
        );

  }


  // ========================================================
  // 19. ACTUALIZAR TEXTO DE BÚSQUEDA
  // ========================================================

  cambiarBusqueda(valor: string): void {

    this.busqueda = valor;

  }


  // ========================================================
  // 20. CAMBIAR FILTRO DE ESTADO
  // ========================================================

  cambiarFiltro(valor: string): void {

    const filtros: FiltroMedicamento[] = [

      'TODOS',

      'ACTIVOS',

      'INACTIVOS',

      'DISPONIBLES',

      'AGOTADOS'

    ];


    this.filtro = filtros.includes(
      valor as FiltroMedicamento
    )

      ? valor as FiltroMedicamento

      : 'TODOS';

  }


  // ========================================================
  // 21. NUEVO: CAMBIAR ORDENAMIENTO
  // ========================================================

  cambiarOrden(valor: string): void {

    const opciones: OrdenMedicamento[] = [

      'NOMBRE_ASC',

      'NOMBRE_DESC',

      'PRECIO_ASC',

      'PRECIO_DESC',

      'STOCK_ASC',

      'STOCK_DESC'

    ];


    this.ordenarPor = opciones.includes(
      valor as OrdenMedicamento
    )

      ? valor as OrdenMedicamento

      : 'NOMBRE_ASC';

  }


  // ========================================================
  // 22. LIMPIAR BÚSQUEDA, FILTROS Y ORDENAMIENTO
  // ========================================================

  limpiarFiltros(): void {

    this.busqueda = '';

    this.filtro = 'TODOS';

    this.ordenarPor = 'NOMBRE_ASC';

  }


  // ========================================================
  // 23. CONVERTIR STOCK A NÚMERO
  // ========================================================

  private obtenerStock(
    medicamento: MedicamentoCatalogo
  ): number | null {

    const valor =
      medicamento.stockDisponible;


    if (
      valor === null ||
      valor === undefined ||
      valor === ''
    ) {
      return null;
    }


    const stock = Number(valor);

    return Number.isFinite(stock)

      ? stock

      : null;

  }


  // ========================================================
  // 24. CONVERTIR PRECIO A NÚMERO
  // ========================================================

  private obtenerPrecio(
    medicamento: MedicamentoCatalogo
  ): number | null {

    const valor =
      medicamento.precioUnitario;


    if (
      valor === null ||
      valor === undefined ||
      valor === ''
    ) {
      return null;
    }


    const precio = Number(valor);

    return Number.isFinite(precio)

      ? precio

      : null;

  }


  // ========================================================
  // 25. MOSTRAR STOCK CON UNIDAD
  // ========================================================

  stockTexto(
    medicamento: MedicamentoCatalogo
  ): string {

    const stock =
      this.obtenerStock(medicamento);


    if (stock === null) {

      return 'No informado';

    }


    const unidad =
      medicamento.unidadMedida || 'unidades';


    return `${stock.toLocaleString('es-EC', {

      maximumFractionDigits: 2

    })} ${unidad}`;

  }


  // ========================================================
  // 26. DETERMINAR ESTADO DEL MEDICAMENTO
  // ========================================================

  estadoTexto(
    medicamento: MedicamentoCatalogo
  ): string {


    if (medicamento.activo === false) {

      return 'Inactivo';

    }


    if (medicamento.activo !== true) {

      return 'Estado no informado';

    }


    const stock =
      this.obtenerStock(medicamento);


    if (stock === null) {

      return 'Stock no informado';

    }


    return stock > 0

      ? 'Disponible'

      : 'Agotado';

  }


  // ========================================================
  // 27. CLASE CSS SEGÚN EL ESTADO
  // ========================================================

  claseEstado(
    medicamento: MedicamentoCatalogo
  ): string {


    if (medicamento.activo === false) {

      return 'status--inactive';

    }


    if (medicamento.activo !== true) {

      return 'status--unknown';

    }


    const stock =
      this.obtenerStock(medicamento);


    if (stock === null) {

      return 'status--unknown';

    }


    return stock > 0

      ? 'status--available'

      : 'status--empty';

  }


  // ========================================================
  // 28. CONVERTIR VALORES NUMÉRICOS
  // ========================================================

  numero(
    valor: number | string | null | undefined
  ): number {

    const resultado = Number(valor ?? 0);

    return Number.isFinite(resultado)

      ? resultado

      : 0;

  }


  // ========================================================
  // 29. IDENTIFICAR MEDICAMENTOS EN ANGULAR
  // ========================================================

  identificarMedicamento(
    _indice: number,
    medicamento: MedicamentoCatalogo
  ): number {

    return medicamento.id;

  }


  // ========================================================
  // 30. NORMALIZAR TEXTO DE BÚSQUEDA
  // ========================================================

  private normalizar(valor: unknown): string {

    return String(valor ?? '')

      .normalize('NFD')

      .replace(/[\u0300-\u036f]/g, '')

      .toLowerCase()

      .trim();

  }


  // ========================================================
  // 31. MANEJO DE ERRORES
  // ========================================================

  private obtenerMensajeError(
    error: any
  ): string {


    if (error?.name === 'TimeoutError') {

      return 'La consulta tardó demasiado. Intenta actualizar los datos.';

    }


    if (error?.status === 0) {

      return 'No se pudo conectar con Spring Boot. Revisa la conexión con el servidor.';

    }


    if (error?.status === 401) {

      return 'Tu sesión expiró. Inicia sesión nuevamente.';

    }


    if (error?.status === 403) {

      return 'Tu cuenta no tiene permisos para consultar el catálogo.';

    }


    const mensaje =

      error?.error?.mensaje ??

      error?.error?.message;


    if (
      typeof mensaje === 'string' &&
      mensaje.trim()
    ) {

      return mensaje;

    }


    return 'No se pudo cargar el catálogo de medicamentos. Intenta nuevamente.';

  }

}
