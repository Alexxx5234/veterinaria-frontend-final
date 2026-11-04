
/* ==========================================================
   VETERINARIA AREVALO
   ADMINISTRACIÓN DE MASCOTAS

   MEJORAS:
   - Consulta de todas las mascotas.
   - Estadísticas generales.
   - Búsqueda por mascota, raza o propietario.
   - Filtro por especie.
   - Ordenamiento por nombre y edad.
   - Edición conservando el propietario.
   - Eliminación con confirmación.
   - Validaciones y estados de carga.
   - Notificaciones globales.
   ========================================================== */

// ==========================================================
// IMPORTACIONES ANGULAR
// ==========================================================

import {
  Component,
  OnInit,
  ChangeDetectorRef,
  ViewChild,
  ElementRef
} from '@angular/core';

import { CommonModule } from '@angular/common';

import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';

import { Router } from '@angular/router';

// ==========================================================
// SERVICIOS
// ==========================================================

import { MascotaServicio }
  from '../../../Servicios/mascota-servicio';

import { NotificacionesServicio }
  from '../../../Servicios/notificaciones-servicio';

// ==========================================================
// INTERFACES
// ==========================================================

// Información del propietario recibida de Spring Boot.
interface PropietarioMascota {
  id?: number;
  nombre?: string;
  correo?: string;
  [campo: string]: any;
}

// Información de una mascota.
interface MascotaAdmin {
  id: number;
  nombre: string;
  especie: string;
  raza: string;
  edad: number;
  sexo: string;
  usuario?: PropietarioMascota | null;
}

// ==========================================================
// COMPONENTE
// ==========================================================

@Component({
  selector: 'app-admin-mascotas',
  standalone: true,

  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule
  ],

  templateUrl: './admin-mascotas.html',
  styleUrl: './admin-mascotas.scss'
})
export class AdminMascotas implements OnInit {

  // ========================================================
  // REGISTROS Y ESTADOS
  // ========================================================

  mascotas: MascotaAdmin[] = [];

  cargando: boolean = false;
  errorCarga: boolean = false;

  guardando: boolean = false;
  eliminandoId: number | null = null;

  mensajeError: string = '';
  mensajeExito: string = '';

  // ========================================================
  // BÚSQUEDA, FILTROS Y ORDEN
  // ========================================================

  busqueda: string = '';
  filtroEspecie: string = 'TODAS';

  ordenarPor: string = 'nombreAsc';

  // ========================================================
  // EDICIÓN
  // ========================================================

  mascotaForm: FormGroup;

  mostrarFormulario: boolean = false;

  mascotaEditandoId: number | null = null;

  // Conserva el propietario original del registro.
  usuarioActual: PropietarioMascota | null = null;

  // Permite enfocar el primer campo al editar.
  @ViewChild('campoNombre')
  campoNombre?: ElementRef<HTMLInputElement>;

  // ========================================================
  // CONSTRUCTOR
  // ========================================================

  constructor(
    private mascotaServicio: MascotaServicio,
    private notificacionesServicio: NotificacionesServicio,
    private fb: FormBuilder,
    private router: Router,
    private cd: ChangeDetectorRef
  ) {

    // Campos existentes en Mascota.java.
    this.mascotaForm = this.fb.group({

      nombre: [
        '',
        Validators.required
      ],

      especie: [
        '',
        Validators.required
      ],

      raza: [
        '',
        Validators.required
      ],

      edad: [
        '',
        [
          Validators.required,
          Validators.min(0),
          Validators.pattern(/^[0-9]+$/)
        ]
      ],

      sexo: [
        '',
        Validators.required
      ]

    });

  }

  // ========================================================
  // INICIAR PÁGINA
  // ========================================================

  ngOnInit(): void {
    this.cargarMascotas();
  }

  // ========================================================
  // NORMALIZAR TEXTO
  // ========================================================

  // Permite buscar con o sin tildes.
  private normalizarTexto(valor: unknown): string {

    return String(valor ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();

  }

  // ========================================================
  // CONSULTAR MASCOTAS DESDE SPRING BOOT
  // ========================================================

  cargarMascotas(
    actualizacionManual: boolean = false
  ): void {

    // Evitamos consultas duplicadas.
    if (this.cargando) {
      return;
    }

    this.cargando = true;
    this.errorCarga = false;
    this.mensajeError = '';

    // GET /api/mascotas - Solo ADMIN.
    this.mascotaServicio
      .listarTodasMascotas()
      .subscribe({

        next: (respuesta) => {

          // Solo aceptamos un arreglo de registros.
          this.mascotas = Array.isArray(respuesta)
            ? respuesta
            : [];

          this.cargando = false;
          this.errorCarga = false;

          if (actualizacionManual) {

            this.mensajeExito =
              'El listado de mascotas se actualizó correctamente.';

          }

          this.cd.detectChanges();

        },

        error: (error) => {

          console.error(
            'Error al cargar mascotas:',
            error
          );

          this.cargando = false;
          this.errorCarga = true;

          this.mensajeError =
            error?.status === 0
              ? 'No se pudo conectar con Spring Boot. Revisa que la API esté encendida.'
              : 'No se pudieron cargar las mascotas. Intenta nuevamente.';

          this.notificacionesServicio.agregar(
            'Error al consultar mascotas',
            'No fue posible obtener el listado de mascotas.',
            'error'
          );

          this.cd.detectChanges();

        }

      });

  }

  // ========================================================
  // ESTADÍSTICAS
  // ========================================================

  get totalMascotas(): number {
    return this.mascotas.length;
  }

  get totalPerros(): number {

    return this.mascotas.filter(mascota =>
      this.normalizarTexto(mascota.especie) === 'perro'
    ).length;

  }

  get totalGatos(): number {

    return this.mascotas.filter(mascota =>
      this.normalizarTexto(mascota.especie) === 'gato'
    ).length;

  }

  get totalPropietarios(): number {

    // Contamos propietarios diferentes por ID.
    // Si falta el ID, utilizamos el correo.
    const identificadores = this.mascotas
      .map(mascota => {

        const usuario = mascota.usuario;

        if (!usuario) {
          return '';
        }

        if (usuario.id !== undefined &&
            usuario.id !== null) {
          return `id:${usuario.id}`;
        }

        return usuario.correo
          ? `correo:${this.normalizarTexto(usuario.correo)}`
          : '';

      })
      .filter(valor => valor.length > 0);

    return new Set(identificadores).size;

  }

  // ========================================================
  // ESPECIES DISPONIBLES
  // ========================================================

  // El filtro utiliza valores reales de la API.
  get especiesDisponibles(): string[] {

    return Array.from(

      new Set(
        this.mascotas
          .map(mascota => String(mascota.especie ?? '').trim())
          .filter(especie => especie.length > 0)
      )

    ).sort((a, b) =>
      a.localeCompare(b, 'es', {
        sensitivity: 'base'
      })
    );

  }

  // ========================================================
  // MASCOTAS FILTRADAS
  // ========================================================

  get mascotasFiltradas(): MascotaAdmin[] {

    const texto = this.normalizarTexto(this.busqueda);

    const especieBuscada =
      this.normalizarTexto(this.filtroEspecie);

    const resultado = this.mascotas.filter(mascota => {

      // Incluimos el propietario en la búsqueda.
      const contenido = this.normalizarTexto([

        mascota.nombre,
        mascota.especie,
        mascota.raza,
        mascota.usuario?.nombre,
        mascota.usuario?.correo,
        mascota.id

      ].join(' '));

      const coincideTexto =
        contenido.includes(texto);

      const coincideEspecie =
        this.filtroEspecie === 'TODAS' ||
        this.normalizarTexto(mascota.especie) === especieBuscada;

      return coincideTexto && coincideEspecie;

    });

    // Ordenamos sin modificar la lista original.
    return [...resultado].sort((a, b) => {

      if (this.ordenarPor === 'edadAsc') {
        return Number(a.edad) - Number(b.edad);
      }

      if (this.ordenarPor === 'edadDesc') {
        return Number(b.edad) - Number(a.edad);
      }

      const comparacion = String(a.nombre ?? '')
        .localeCompare(
          String(b.nombre ?? ''),
          'es',
          { sensitivity: 'base' }
        );

      return this.ordenarPor === 'nombreDesc'
        ? -comparacion
        : comparacion;

    });

  }

  // ========================================================
  // LIMPIAR FILTROS
  // ========================================================

  limpiarFiltros(): void {
    this.busqueda = '';
    this.filtroEspecie = 'TODAS';
    this.ordenarPor = 'nombreAsc';
  }

  // ========================================================
  // ÍCONO SEGÚN ESPECIE
  // ========================================================

  obtenerIcono(especie: string): string {

    const valor = this.normalizarTexto(especie);

    if (valor === 'perro') {
      return '🐶';
    }

    if (valor === 'gato') {
      return '🐱';
    }

    return '🐾';

  }

  // ========================================================
  // ABRIR FORMULARIO DE EDICIÓN
  // ========================================================

  editarMascota(mascota: MascotaAdmin): void {

    if (this.guardando || this.eliminandoId !== null) {
      return;
    }

    // Guardamos el ID de la mascota seleccionada.
    this.mascotaEditandoId = mascota.id;

    // Conservamos la relación con el dueño.
    this.usuarioActual = mascota.usuario ?? null;

    // Cargamos la información actual en el formulario.
    this.mascotaForm.reset({

      nombre: mascota.nombre,
      especie: mascota.especie,
      raza: mascota.raza,
      edad: mascota.edad,
      sexo: mascota.sexo

    });

    this.mensajeError = '';
    this.mensajeExito = '';

    this.mostrarFormulario = true;

    // Actualiza el formulario antes de enfocar el input.
    this.cd.detectChanges();

    this.campoNombre?.nativeElement.focus();

  }

  // ========================================================
  // GUARDAR CAMBIOS DE LA MASCOTA
  // ========================================================

  guardarMascota(): void {

    if (this.guardando || this.eliminandoId !== null) {
      return;
    }

    this.mensajeError = '';

    // Comprobar que exista una mascota seleccionada.
    if (this.mascotaEditandoId === null) {
      return;
    }

    // Validar campos.
    if (this.mascotaForm.invalid) {

      this.mascotaForm.markAllAsTouched();
      return;

    }

    const valores = this.mascotaForm.getRawValue();

    // Evitar textos que contengan solo espacios.
    const nombre = String(valores.nombre ?? '').trim();
    const especie = String(valores.especie ?? '').trim();
    const raza = String(valores.raza ?? '').trim();

    if (!nombre || !especie || !raza) {

      if (!nombre) {
        this.mascotaForm.get('nombre')?.setErrors({
          required: true
        });
      }

      if (!especie) {
        this.mascotaForm.get('especie')?.setErrors({
          required: true
        });
      }

      if (!raza) {
        this.mascotaForm.get('raza')?.setErrors({
          required: true
        });
      }

      this.mascotaForm.markAllAsTouched();
      return;

    }

    // ======================================================
    // PREPARAR JSON PARA SPRING BOOT
    // ======================================================

    // Conservamos exactamente la relación usuario
    // utilizada en tu código original.
    const datosMascota = {

      nombre,
      especie,
      raza,

      edad: Number(valores.edad),

      sexo: valores.sexo,

      usuario: this.usuarioActual

    };

    const id = this.mascotaEditandoId;

    this.guardando = true;

    // PUT /api/mascotas/{id}
    this.mascotaServicio
      .actualizarMascota(id, datosMascota)
      .subscribe({

        next: () => {

          this.guardando = false;

          this.mensajeExito =
            'Mascota actualizada correctamente.';

          this.notificacionesServicio.agregar(
            'Mascota actualizada',
            `Se guardaron los cambios de ${nombre}.`,
            'exito'
          );

          // Cerrar sin eliminar el mensaje de éxito.
          this.cerrarFormulario();

          // Volver a consultar sin recargar el navegador.
          this.cargarMascotas();

        },

        error: (error) => {

          console.error(
            'Error al actualizar mascota:',
            error
          );

          this.guardando = false;

          this.mensajeError =
            error?.error?.mensaje ||
            error?.error?.message ||
            'No se pudo actualizar la mascota.';

          this.notificacionesServicio.agregar(
            'Error al actualizar mascota',
            `No se pudieron guardar los cambios de ${nombre}.`,
            'error'
          );

          this.cd.detectChanges();

        }

      });

  }

  // ========================================================
  // ELIMINAR MASCOTA
  // ========================================================

  eliminarMascota(mascota: MascotaAdmin): void {

    if (this.guardando || this.eliminandoId !== null) {
      return;
    }

    // Confirmación antes de una acción irreversible.
    const confirmado = window.confirm(

      `¿Estás seguro de eliminar permanentemente a ${mascota.nombre}? ` +
      'Esta acción no se puede deshacer.'

    );

    if (!confirmado) {
      return;
    }

    this.eliminandoId = mascota.id;

    this.mensajeError = '';
    this.mensajeExito = '';

    // DELETE /api/mascotas/{id}
    this.mascotaServicio
      .eliminarMascota(mascota.id)
      .subscribe({

        next: () => {

          this.eliminandoId = null;

          this.mensajeExito =
            'Mascota eliminada correctamente.';

          this.notificacionesServicio.agregar(
            'Mascota eliminada',
            `Se eliminó a ${mascota.nombre} del sistema.`,
            'exito'
          );

          // Si se eliminó la mascota que se estaba
          // editando, cerramos su formulario.
          if (this.mascotaEditandoId === mascota.id) {
            this.cerrarFormulario();
          }

          this.cargarMascotas();

        },

        error: (error) => {

          console.error(
            'Error al eliminar mascota:',
            error
          );

          this.eliminandoId = null;

          this.mensajeError =
            error?.error?.mensaje ||
            error?.error?.message ||
            'No se pudo eliminar la mascota. Puede tener citas asociadas.';

          this.notificacionesServicio.agregar(
            'Error al eliminar mascota',
            `No se pudo eliminar a ${mascota.nombre}.`,
            'error'
          );

          this.cd.detectChanges();

        }

      });

  }

  // ========================================================
  // CERRAR FORMULARIO
  // ========================================================

  cerrarFormulario(): void {

    if (this.guardando) {
      return;
    }

    this.mostrarFormulario = false;

    this.mascotaEditandoId = null;

    this.usuarioActual = null;

    this.mascotaForm.reset();

    this.cd.detectChanges();

  }

  // ========================================================
  // IDENTIFICAR MASCOTAS EN EL HTML
  // ========================================================

  trackByMascota(
    index: number,
    mascota: MascotaAdmin
  ): number {

    return mascota.id ?? index;

  }

  // ========================================================
  // VOLVER AL DASHBOARD ADMIN
  // ========================================================

  volverDashboard(): void {

    void this.router.navigate([
      '/admin/dashboard'
    ]);

  }

}
