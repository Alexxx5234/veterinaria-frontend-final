
// ==========================================================
// VETERINARIA AREVALO - MIS MASCOTAS
//
// MEJORAS:
// - Notificaciones sobre operaciones reales.
// - Opciones de accesibilidad.
// - Validaciones comprensibles.
// - Evitar solicitudes duplicadas.
// - Conservar los métodos de la API REST.
// ==========================================================

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

import { Router } from '@angular/router';

import {
  MascotaServicio
} from '../../../Servicios/mascota-servicio';


// ==========================================================
// ESTRUCTURA DE LAS NOTIFICACIONES
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
    ReactiveFormsModule
  ],

  templateUrl: './mascotas.html',

  styleUrl: './mascotas.scss'
})
export class Mascotas implements OnInit {


  // ========================================================
  // LISTA DE MASCOTAS
  // ========================================================

  mascotas: any[] = [];


  // ========================================================
  // ESTADOS DE LA PÁGINA
  // ========================================================

  cargando: boolean = false;

  // Separa el proceso de guardar del proceso de consultar.
  guardando: boolean = false;

  mensajeError: string = '';

  mensajeExito: string = '';


  // ========================================================
  // FORMULARIO
  // ========================================================

  mascotaForm: FormGroup;

  mostrarFormulario: boolean = false;

  mascotaEditandoId: number | null = null;

  // Permite enfocar el nombre al abrir el formulario.
  @ViewChild('campoNombre')
  campoNombre?: ElementRef<HTMLInputElement>;


  // ========================================================
  // NOTIFICACIONES
  // ========================================================

  notificacionesAbiertas: boolean = false;

  notificaciones: NotificacionMascota[] = [];

  private contadorNotificaciones: number = 0;

  // Número de avisos pendientes de lectura.
  get notificacionesNoLeidas(): number {
    return this.notificaciones.filter(
      notificacion => !notificacion.leida
    ).length;
  }


  // ========================================================
  // ACCESIBILIDAD
  // ========================================================

  accesibilidadAbierta: boolean = false;

  altoContraste: boolean = false;

  reducirMovimiento: boolean = false;

  // 1 = tamaño normal.
  // 1.1 = letras 10 % más grandes.
  // 1.2 = letras 20 % más grandes.
  escalaFuente: number = 1;


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
  // AL ABRIR LA PÁGINA
  // ========================================================

  ngOnInit(): void {

    this.recuperarAccesibilidad();

    this.cargarMascotas();

  }


  // ========================================================
  // CONSULTAR MIS MASCOTAS
  // ========================================================

  cargarMascotas(): void {

    this.cargando = true;
    this.mensajeError = '';

    // Conserva el endpoint del servicio original.
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
  // ABRIR FORMULARIO PARA REGISTRAR
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
  // ABRIR FORMULARIO PARA EDITAR
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
  // ENFOCAR EL PRIMER CAMPO
  // ========================================================

  private enfocarFormulario(): void {

    // Primero actualizamos el formulario *ngIf.
    this.cd.detectChanges();

    // Luego enfocamos el campo del nombre.
    this.campoNombre?.nativeElement.focus();

  }


  // ========================================================
  // REGISTRAR O EDITAR MASCOTA
  // ========================================================

  guardarMascota(): void {

    // Evita dos solicitudes simultáneas.
    if (this.guardando) {
      return;
    }

    this.mensajeError = '';
    this.mensajeExito = '';

    // Validaciones declaradas en FormBuilder.
    if (this.mascotaForm.invalid) {

      this.mascotaForm.markAllAsTouched();

      return;
    }

    // Obtenemos y limpiamos los datos.
    const valores = this.mascotaForm.getRawValue();

    const datosMascota = {
      nombre: String(valores.nombre ?? '').trim(),
      especie: String(valores.especie ?? '').trim(),
      raza: String(valores.raza ?? '').trim(),
      edad: Number(valores.edad),
      sexo: valores.sexo
    };

    // Impedir que se registren campos solo con espacios.
    if (
      !datosMascota.nombre ||
      !datosMascota.especie ||
      !datosMascota.raza
    ) {

      for (
        const campo of ['nombre', 'especie', 'raza']
      ) {

        const control = this.mascotaForm.get(campo);

        if (
          !String(control?.value ?? '').trim()
        ) {

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
    // EDITAR MASCOTA - PUT
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
    // REGISTRAR MASCOTA - POST
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

          // Actualiza solo la lista, sin recargar la web.
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

    // No permitir cerrar mientras se guarda.
    if (this.guardando) {
      return;
    }

    this.mostrarFormulario = false;

    this.mascotaEditandoId = null;

    this.mascotaForm.reset();

    this.cd.detectChanges();

  }


  // ========================================================
  // AGREGAR NOTIFICACIÓN
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

    // Conservamos máximo 10 avisos recientes.
    this.notificaciones =
      this.notificaciones.slice(0, 10);

  }


  // ========================================================
  // ABRIR O CERRAR NOTIFICACIONES
  // ========================================================

  cambiarNotificaciones(): void {

    this.notificacionesAbiertas =
      !this.notificacionesAbiertas;

    this.accesibilidadAbierta = false;

    if (this.notificacionesAbiertas) {

      // Al abrir el panel se marcan como leídas.
      this.notificaciones = this.notificaciones.map(
        notificacion => ({
          ...notificacion,
          leida: true
        })
      );

    }

  }


  // ========================================================
  // LIMPIAR AVISOS
  // ========================================================

  limpiarNotificaciones(): void {

    this.notificaciones = [];

  }


  // ========================================================
  // ABRIR O CERRAR ACCESIBILIDAD
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
  // AUMENTAR TAMAÑO DE LETRA
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
  // REDUCIR TAMAÑO DE LETRA
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
  // RESTABLECER PREFERENCIAS
  // ========================================================

  restablecerAccesibilidad(): void {

    this.altoContraste = false;

    this.reducirMovimiento = false;

    this.escalaFuente = 1;

    this.guardarAccesibilidad();

  }


  // ========================================================
  // GUARDAR PREFERENCIAS DE ESTA PESTAÑA
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

      // La página puede funcionar aunque el navegador
      // no permita guardar preferencias.
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
  // VOLVER AL DASHBOARD USER
  // ========================================================

  volverDashboard(): void {

    void this.router.navigate([
      '/usuario/dashboard'
    ]);

  }

}
