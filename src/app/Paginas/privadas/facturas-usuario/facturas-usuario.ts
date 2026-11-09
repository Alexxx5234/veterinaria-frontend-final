import { environment } from '../../../../environments/environment';

/* ==========================================================
   VETERINARIA ARÉVALO - MIS FACTURAS
   ROL: USER

   - Consulta facturas propias con JWT.
   - Búsqueda por factura, mascota y servicio.
   - Filtros por fechas.
   - Ordenamiento.
   - Detalle de medicamentos y valores.
   - Descarga de PDF.
   - No permite emitir, editar ni eliminar.
========================================================== */

import {
  Component,
  OnInit,
  ChangeDetectorRef
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import {
  HttpClient,
  HttpHeaders
} from '@angular/common/http';

import { finalize, timeout } from 'rxjs';
import { AuthServicio } from '../../../Servicios/auth-servicio';

// Los campos coinciden con FacturaService.FacturaRespuesta.
interface MedicamentoFactura {
  detalleId: number;
  medicamentoId: number;
  nombreMedicamento: string;
  unidadMedida: string;
  tipoRegistro: string;
  cantidad: number | string;
  precioUnitario: number | string;
  subtotal: number | string;
  indicaciones?: string | null;
}

interface FacturaUsuario {
  id: number;
  numeroFactura: string;
  atencionId: number;
  citaId: number;
  nombreCliente: string;
  correoCliente: string;
  nombreMascota: string;
  nombreVeterinario: string;
  nombreServicio: string;
  precioServicio: number | string;
  medicamentos: MedicamentoFactura[];
  totalMedicamentos: number | string;
  subtotal: number | string;
  impuestos: number | string;
  total: number | string;
  estado: string;
  correoEnviado: boolean;
  fechaCreacion: string;
  fechaEmision: string | null;
}

@Component({
  selector: 'app-facturas-usuario',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink
  ],
  templateUrl: './facturas-usuario.html',
  styleUrl: './facturas-usuario.scss'
})
export class FacturasUsuario implements OnInit {

  // Dirección utilizada en tu proyecto.
  private readonly apiUrl =
    environment.apiUrl;

  facturas: FacturaUsuario[] = [];

  cargando = false;
  error = '';
  descargandoId: number | null = null;

  busqueda = '';
  desde = '';
  hasta = '';
  estado = 'TODOS';
  orden = 'RECIENTES';

  facturaSeleccionada: FacturaUsuario | null = null;

  constructor(
    private http: HttpClient,
    private auth: AuthServicio,
    private cd: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.cargarFacturas();
  }

  // ========================================================
  // ENCABEZADO DE AUTENTICACIÓN
  // ========================================================

  private headers(): HttpHeaders {
    const token = this.auth.obtenerToken();

    return token
      ? new HttpHeaders({
          Authorization: `Bearer ${token}`
        })
      : new HttpHeaders();
  }

  // ========================================================
  // CONSULTAR FACTURAS DEL USUARIO AUTENTICADO
  // ========================================================

  cargarFacturas(): void {
    if (this.cargando) return;

    this.cargando = true;
    this.error = '';
    this.facturaSeleccionada = null;

    this.http.get<FacturaUsuario[]>(
      `${this.apiUrl}/facturas/mis-facturas`,
      { headers: this.headers() }
    ).pipe(
      timeout(20000),
      finalize(() => {
        this.cargando = false;
        this.cd.detectChanges();
      })
    ).subscribe({
      next: respuesta => {
        if (!Array.isArray(respuesta)) {
          this.facturas = [];
          this.error = 'La respuesta de facturas no es válida.';
          return;
        }

        this.facturas = respuesta;
        this.cd.detectChanges();
      },

      error: error => {
        this.facturas = [];

        if (error?.status === 401) {
          this.error = 'Tu sesión expiró. Inicia sesión nuevamente.';
        } else if (error?.status === 403) {
          this.error = 'No tienes permiso para consultar estas facturas.';
        } else {
          this.error = 'No fue posible consultar tus facturas.';
        }

        console.error('Error al consultar facturas:', error);
        this.cd.detectChanges();
      }
    });
  }

  // ========================================================
  // BÚSQUEDA Y FILTROS
  // ========================================================

  private normalizar(valor: unknown): string {
    return String(valor ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  get facturasFiltradas(): FacturaUsuario[] {
    const texto = this.normalizar(this.busqueda);

    const resultado = this.facturas.filter(f => {
      const contenido = this.normalizar([
        f.numeroFactura,
        f.nombreMascota,
        f.nombreServicio,
        f.nombreVeterinario,
        f.nombreCliente
      ].join(' '));

      const fecha = (
        f.fechaEmision || f.fechaCreacion || ''
      ).substring(0, 10);

      return (
        (!texto || contenido.includes(texto)) &&
        (this.estado === 'TODOS' || f.estado === this.estado) &&
        (!this.desde || fecha >= this.desde) &&
        (!this.hasta || fecha <= this.hasta)
      );
    });

    return [...resultado].sort((a, b) => {
      if (this.orden === 'MAYOR_TOTAL') {
        return this.numero(b.total) - this.numero(a.total);
      }

      if (this.orden === 'MENOR_TOTAL') {
        return this.numero(a.total) - this.numero(b.total);
      }

      const fechaA = a.fechaEmision || a.fechaCreacion || '';
      const fechaB = b.fechaEmision || b.fechaCreacion || '';

      return this.orden === 'ANTIGUAS'
        ? fechaA.localeCompare(fechaB)
        : fechaB.localeCompare(fechaA);
    });
  }

  get totalFacturado(): number {
    return this.facturas
      .filter(f => f.estado === 'EMITIDA')
      .reduce((suma, f) => suma + this.numero(f.total), 0);
  }

  get totalEmitidas(): number {
    return this.facturas.filter(
      f => f.estado === 'EMITIDA'
    ).length;
  }

  numero(valor: number | string | null | undefined): number {
    const cantidad = Number(valor ?? 0);
    return Number.isFinite(cantidad) ? cantidad : 0;
  }

  limpiarFiltros(): void {
    this.busqueda = '';
    this.desde = '';
    this.hasta = '';
    this.estado = 'TODOS';
    this.orden = 'RECIENTES';
  }

  // ========================================================
  // DETALLE DE FACTURA
  // ========================================================

  verDetalle(factura: FacturaUsuario): void {
    this.facturaSeleccionada =
      this.facturaSeleccionada?.id === factura.id
        ? null
        : factura;
  }

  cerrarDetalle(): void {
    this.facturaSeleccionada = null;
  }

  // ========================================================
  // DESCARGAR PDF CON JWT
  // ========================================================

  descargarPdf(factura: FacturaUsuario): void {
    if (this.descargandoId !== null) return;
    if (factura.estado !== 'EMITIDA') return;

    this.descargandoId = factura.id;
    this.error = '';

    this.http.get(
      `${this.apiUrl}/facturas/${factura.id}/pdf`,
      {
        headers: this.headers(),
        responseType: 'blob'
      }
    ).pipe(
      timeout(30000),
      finalize(() => {
        this.descargandoId = null;
        this.cd.detectChanges();
      })
    ).subscribe({
      next: blob => {
        if (!blob.size) {
          this.error = 'El PDF llegó vacío.';
          this.cd.detectChanges();
          return;
        }

        const url = URL.createObjectURL(blob);
        const enlace = document.createElement('a');

        const numeroSeguro = (
          factura.numeroFactura || `factura-${factura.id}`
        ).replace(/[^a-zA-Z0-9_-]/g, '_');

        enlace.href = url;
        enlace.download = `${numeroSeguro}.pdf`;

        document.body.appendChild(enlace);
        enlace.click();
        enlace.remove();

        setTimeout(() => URL.revokeObjectURL(url), 1000);
      },

      error: error => {
        this.error = error?.status === 403
          ? 'No tienes permiso para descargar esta factura.'
          : 'No se pudo descargar el PDF.';

        console.error('Error al descargar PDF:', error);
        this.cd.detectChanges();
      }
    });
  }

  identificarFactura(
    _index: number,
    factura: FacturaUsuario
  ): number {
    return factura.id;
  }
}
