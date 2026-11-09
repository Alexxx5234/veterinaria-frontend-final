
/* ==========================================================
   VETERINARIA ARÉVALO
   MÓDULO USER: MIS MASCOTAS

   FUNCIONALIDADES CONSERVADAS:
   - Consultar mascotas del propietario.
   - Registrar mascotas.
   - Editar mascotas.
   - Validaciones de formulario.
   - Notificaciones de operaciones.
   - Alto contraste.
   - Tamaño de texto ajustable.
   - Reducción de animaciones.
   - Preferencias de accesibilidad por pestaña.
   - Navegación al dashboard.

   NUEVO:
   - RouterLink para accesos rápidos a los módulos USER.

   SEGURIDAD:
   El backend debe verificar que cada mascota
   pertenezca al usuario autenticado.
========================================================== */

import {
  Component,
  OnInit,
  ChangeDetectorRef,
  HostListener,
  ViewChild,
  ElementRef
} from '@angular/core';

import { CommonModule } from '@angular/common';

import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';

import {
  Router,
  RouterLink
} from '@angular/router';

import { MascotaServicio }
  from '../../../Servicios/mascota-servicio';

// ==========================================================
// NOTIFICACIONES DE MASCOTAS
// ==========================================================

interface NotificacionMascota {
  id: number;
  titulo: string;
  mensaje: string;
  tipo: 'exito' | 'error' | 'info';
  hora: string;
  leida: boolean;
}

// ==========================================================
// COMPONENTE
// ==========================================================

@Component({
  selector: 'app-mascotas',
  standalone: true,

  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink
  ],

  templateUrl: './mascotas.html',
  styleUrl: './mascotas.scss'
})
export class Mascotas implements OnInit {

  // ========================================================
  // LISTADO Y ESTADOS
  // ========================================================

  mascotas: any[] = [];

  cargando = false;
  guardando = false;

  mensajeError = '';
  mensajeExito = '';

  // ========================================================
  // FORMULARIO
  // ========================================================

  mascotaForm: FormGroup;

  mostrarFormulario = false;
  mascotaEditandoId: number | null = null;

  @ViewChild('campoNombre')
  campoNombre?: ElementRef<HTMLInputElement>;

  // ========================================================
  // NOTIFICACIONES
  // ========================================================

  notificacionesAbiertas = false;

  notificaciones: NotificacionMascota[] = [];

  private contadorNotificaciones = 0;

  get notificacionesNoLeidas(): number {
    return this.notificaciones.filter(
      notificacion => !notificacion.leida
    ).length;
  }

  // ========================================================
  // ACCESIBILIDAD
  // ========================================================

  accesibilidadAbierta = false;

  altoContraste = false;
  reducirMovimiento = false;

  // 1 = 100 % de tamaño de fuente.
  escalaFuente = 1;

  // ========================================================
  // CONSTRUCTOR
  // ========================================================

  constructor(
    private mascotaServicio: MascotaServicio,
    private router: Router,
    private fb: FormBuilder,
    private cd: ChangeDetectorRef
  ) {

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
          Validators.pattern(/^\d+$/)
        ]
      ],

      sexo: [
        '',
        Validators.required
      ]
    });
  }

  // ========================================================
  // INICIAR COMPONENTE
  // ========================================================

  ngOnInit(): void {
    this.recuperarAccesibilidad();
    this.cargarMascotas();
  }

  // ========================================================
  // CONSULTAR MASCOTAS
  // ========================================================

  cargarMascotas(): void {

    this.cargando = true;
    this.mensajeError = '';

    this.mascotaServicio
      .listarMisMascotas()
      .subscribe({

        next: (respuesta: any) => {

          this.mascotas = Array.isArray(respuesta)
            ? respuesta
            : [];

          this.cargando = false;
          this.cd.detectChanges();
        },

        error: (error: any) => {

          console.error(
            'Error al cargar mascotas:',
            error
          );

          this.mensajeError =
            'No se pudieron cargar tus mascotas. Intenta nuevamente.';

          this.cargando = false;

          this.agregarNotificacion(
            'Error al consultar mascotas',
            'No se pudo obtener la información del servidor.',
            'error'
          );

          this.cd.detectChanges();
        }
      });
  }

  // ========================================================
  // ABRIR REGISTRO NUEVO
  // ========================================================

  nuevaMascota(): void {

    this.mascotaEditandoId = null;

    this.mascotaForm.reset();

    this.mensajeError = '';
    this.mensajeExito = '';

    this.mostrarFormulario = true;

    this.enfocarFormulario();
  }

  // ========================================================
  // ABRIR EDICIÓN
  // ========================================================

  editarMascota(mascota: any): void {

    this.mascotaEditandoId = mascota.id;

    this.mascotaForm.patchValue({
      nombre: mascota.nombre,
      especie: mascota.especie,
      raza: mascota.raza,
      edad: mascota.edad,
      sexo: mascota.sexo
    });

    this.mensajeError = '';
    this.mensajeExito = '';

    this.mostrarFormulario = true;

    this.enfocarFormulario();
  }

  // ========================================================
  // ENFOCAR CAMPO NOMBRE
  // ========================================================

  private enfocarFormulario(): void {

    // Primero mostrar los elementos del *ngIf.
    this.cd.detectChanges();

    // Luego enfocar el primer campo del formulario.
    this.campoNombre?.nativeElement.focus();
  }

  // ========================================================
  // REGISTRAR O ACTUALIZAR MASCOTA
  // ========================================================

  guardarMascota(): void {

    // Impedir dos solicitudes de guardado simultáneas.
    if (this.guardando) {
      return;
    }

    this.mensajeError = '';
    this.mensajeExito = '';

    // Validaciones del formulario reactivo.
    if (this.mascotaForm.invalid) {
      this.mascotaForm.markAllAsTouched();
      return;
    }

    const valores = this.mascotaForm.getRawValue();

    // Mantener exactamente los campos que recibe la API.
    const datosMascota = {
      nombre: String(valores.nombre ?? '').trim(),
      especie: String(valores.especie ?? '').trim(),
      raza: String(valores.raza ?? '').trim(),
      edad: Number(valores.edad),
      sexo: valores.sexo
    };

    // Validar campos que solo contienen espacios.
    if (
      !datosMascota.nombre ||
      !datosMascota.especie ||
      !datosMascota.raza
    ) {

      for (const campo of ['nombre', 'especie', 'raza']) {

        const control = this.mascotaForm.get(campo);

        if (!String(control?.value ?? '').trim()) {

          control?.setErrors({
            required: true
          });

          control?.markAsTouched();
        }
      }

      return;
    }

    this.guardando = true;

    // ======================================================
    // ACTUALIZAR MASCOTA EXISTENTE
    // ======================================================

    if (this.mascotaEditandoId !== null) {

      this.mascotaServicio
        .actualizarMascota(
          this.mascotaEditandoId,
          datosMascota
        )
        .subscribe({

          next: () => {

            this.guardando = false;

            this.mensajeExito =
              'Los datos de tu mascota se actualizaron correctamente.';

            this.agregarNotificacion(
              'Mascota actualizada',
              `Se actualizaron los datos de ${datosMascota.nombre}.`,
              'exito'
            );

            this.cerrarFormulario();
            this.cargarMascotas();
          },

          error: (error: any) => {

            console.error(
              'Error al actualizar mascota:',
              error
            );

            this.guardando = false;

            this.mensajeError =
              'No fue posible actualizar la mascota. Intenta nuevamente.';

            this.agregarNotificacion(
              'Error al actualizar',
              `No se pudieron guardar los cambios de ${datosMascota.nombre}.`,
              'error'
            );

            this.cd.detectChanges();
          }
        });

      return;
    }

    // ======================================================
    // REGISTRAR NUEVA MASCOTA
    // ======================================================

    this.mascotaServicio
      .registrarMascota(datosMascota)
      .subscribe({

        next: () => {

          this.guardando = false;

          this.mensajeExito =
            'Tu mascota se registró correctamente.';

          this.agregarNotificacion(
            'Mascota registrada',
            `Se registró correctamente a ${datosMascota.nombre}.`,
            'exito'
          );

          this.cerrarFormulario();

          // Actualizar sin recargar el navegador.
          this.cargarMascotas();
        },

        error: (error: any) => {

          console.error(
            'Error al registrar mascota:',
            error
          );

          this.guardando = false;

          this.mensajeError =
            'No fue posible registrar la mascota. Intenta nuevamente.';

          this.agregarNotificacion(
            'Error en el registro',
            `No se pudo registrar a ${datosMascota.nombre}.`,
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

    this.mascotaForm.reset();

    this.cd.detectChanges();
  }

  // ========================================================
  // REGISTRAR NOTIFICACIÓN LOCAL
  // ========================================================

  private agregarNotificacion(
    titulo: string,
    mensaje: string,
    tipo: 'exito' | 'error' | 'info'
  ): void {

    this.contadorNotificaciones++;

    this.notificaciones.unshift({

      id: this.contadorNotificaciones,
      titulo,
      mensaje,
      tipo,

      hora: new Date().toLocaleTimeString(
        'es-EC',
        {
          hour: '2-digit',
          minute: '2-digit'
        }
      ),

      leida: false
    });

    // Máximo 10 avisos recientes.
    this.notificaciones =
      this.notificaciones.slice(0, 10);
  }

  // ========================================================
  // MOSTRAR / OCULTAR NOTIFICACIONES
  // ========================================================

  cambiarNotificaciones(): void {

    this.notificacionesAbiertas =
      !this.notificacionesAbiertas;

    this.accesibilidadAbierta = false;

    if (this.notificacionesAbiertas) {

      this.notificaciones = this.notificaciones.map(
        notificacion => ({
          ...notificacion,
          leida: true
        })
      );
    }
  }

  limpiarNotificaciones(): void {
    this.notificaciones = [];
  }

  // ========================================================
  // MOSTRAR / OCULTAR ACCESIBILIDAD
  // ========================================================

  cambiarAccesibilidad(): void {

    this.accesibilidadAbierta =
      !this.accesibilidadAbierta;

    this.notificacionesAbiertas = false;
  }

  // ========================================================
  // ALTO CONTRASTE
  // ========================================================

  cambiarContraste(): void {

    this.altoContraste = !this.altoContraste;
    this.guardarAccesibilidad();
  }

  // ========================================================
  // AUMENTAR LETRA
  // ========================================================

  aumentarFuente(): void {

    this.escalaFuente = Math.min(
      1.3,
      Math.round(
        (this.escalaFuente + 0.1) * 10
      ) / 10
    );

    this.guardarAccesibilidad();
  }

  // ========================================================
  // DISMINUIR LETRA
  // ========================================================

  disminuirFuente(): void {

    this.escalaFuente = Math.max(
      0.9,
      Math.round(
        (this.escalaFuente - 0.1) * 10
      ) / 10
    );

    this.guardarAccesibilidad();
  }

  // ========================================================
  // REDUCIR ANIMACIONES
  // ========================================================

  cambiarMovimiento(): void {

    this.reducirMovimiento =
      !this.reducirMovimiento;

    this.guardarAccesibilidad();
  }

  // ========================================================
  // RESTABLECER ACCESIBILIDAD
  // ========================================================

  restablecerAccesibilidad(): void {

    this.altoContraste = false;
    this.reducirMovimiento = false;
    this.escalaFuente = 1;

    this.guardarAccesibilidad();
  }

  // ========================================================
  // GUARDAR PREFERENCIAS
  // ========================================================

  private guardarAccesibilidad(): void {

    try {

      sessionStorage.setItem(
        'mascotas-accesibilidad',
        JSON.stringify({
          altoContraste: this.altoContraste,
          reducirMovimiento: this.reducirMovimiento,
          escalaFuente: this.escalaFuente
        })
      );

    } catch {

      // La aplicación continúa funcionando incluso
      // si el navegador bloquea sessionStorage.
    }
  }

  // ========================================================
  // RECUPERAR PREFERENCIAS
  // ========================================================

  private recuperarAccesibilidad(): void {

    try {

      const guardado = sessionStorage.getItem(
        'mascotas-accesibilidad'
      );

      if (!guardado) {
        return;
      }

      const preferencias = JSON.parse(guardado);

      this.altoContraste =
        preferencias.altoContraste === true;

      this.reducirMovimiento =
        preferencias.reducirMovimiento === true;

      const escala = Number(
        preferencias.escalaFuente
      );

      if (Number.isFinite(escala)) {

        this.escalaFuente = Math.max(
          0.9,
          Math.min(1.3, escala)
        );
      }

    } catch {

      this.restablecerAccesibilidad();
    }
  }

  // ========================================================
  // CERRAR PANELES CON ESCAPE
  // ========================================================

  @HostListener('document:keydown.escape')
  cerrarPaneles(): void {

    this.notificacionesAbiertas = false;
    this.accesibilidadAbierta = false;
  }

  // ========================================================
  // VOLVER AL DASHBOARD
  // ========================================================

  volverDashboard(): void {

    void this.router.navigate([
      '/usuario/dashboard'
    ]);
  }
}
