
/* ==========================================================
   VETERINARIA AREVALO
   PANEL DE ACCESIBILIDAD GLOBAL

   FUNCIONES:
   - Contraste normal, suave, alto y oscuro.
   - Escala de la interfaz.
   - Lectura de contenido en voz alta.
   - Navegación hablada mediante clic y teclado.
   - Control de volumen y velocidad.
   - Espaciado de texto.
   - Subrayado de enlaces.
   - Reducción de animaciones.
   - Restablecer preferencias.
   - Guardar ajustes por pestaña.

   No modifica los servicios ni los CRUD.
   ========================================================== */

import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectorRef,
  HostListener,
  inject
} from '@angular/core';

import { CommonModule } from '@angular/common';

import {
  isPlatformBrowser
} from '@angular/common';

import { PLATFORM_ID } from '@angular/core';


// ==========================================================
// TIPOS DE CONFIGURACIÓN
// ==========================================================

type ModoContraste =
  'normal' | 'suave' | 'alto' | 'oscuro';

interface AjustesAccesibilidad {
  contraste: ModoContraste;
  escala: number;
  vozActiva: boolean;
  volumen: number;
  velocidad: number;
  reducirMovimiento: boolean;
  espaciarTexto: boolean;
  subrayarEnlaces: boolean;
}


// ==========================================================
// COMPONENTE
// ==========================================================

@Component({
  selector: 'app-panel-accesibilidad',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './panel-accesibilidad.html',
  styleUrl: './panel-accesibilidad.scss'
})
export class PanelAccesibilidad
  implements OnInit, OnDestroy {

  private readonly platformId = inject(PLATFORM_ID);

  private readonly cd = inject(ChangeDetectorRef);

  private readonly esNavegador =
    isPlatformBrowser(this.platformId);

  // Guarda los ajustes solo en la pestaña actual.
  private readonly CLAVE =
    'veterinaria-accesibilidad-v2';

  // Evita perder una lectura activa.
  private lecturaActual:
    SpeechSynthesisUtterance | null = null;

  private destruido = false;

  // ========================================================
  // ESTADO DEL PANEL
  // ========================================================

  abierto = false;

  leyendo = false;

  vozDisponible = false;

  mensajeVoz = '';

  // ========================================================
  // VALORES INICIALES
  // ========================================================

  ajustes: AjustesAccesibilidad = {
    contraste: 'normal',
    escala: 100,
    vozActiva: false,
    volumen: 80,
    velocidad: 1,
    reducirMovimiento: false,
    espaciarTexto: false,
    subrayarEnlaces: false
  };

  // ========================================================
  // INICIAR
  // ========================================================

  ngOnInit(): void {

    if (!this.esNavegador) {
      return;
    }

    // Comprobar disponibilidad de lectura en voz alta.
    this.vozDisponible =
      'speechSynthesis' in window &&
      'SpeechSynthesisUtterance' in window;

    this.recuperarAjustes();

    this.aplicarAjustes();

  }

  // ========================================================
  // LIMPIAR AL DESTRUIR
  // ========================================================

  ngOnDestroy(): void {

    this.destruido = true;

    this.detenerLectura();

  }

  // ========================================================
  // ABRIR O CERRAR
  // ========================================================

  alternarPanel(): void {
    this.abierto = !this.abierto;
  }

  cerrarPanel(): void {
    this.abierto = false;
  }

  // Cerrar con la tecla Escape.
  @HostListener('document:keydown.escape')
  cerrarConEscape(): void {
    this.cerrarPanel();
  }

  // ========================================================
  // RECUPERAR CONFIGURACIÓN
  // ========================================================

  private recuperarAjustes(): void {

    try {

      const guardado =
        sessionStorage.getItem(this.CLAVE);

      if (!guardado) {
        return;
      }

      const datos = JSON.parse(guardado);

      const modos: ModoContraste[] = [
        'normal',
        'suave',
        'alto',
        'oscuro'
      ];

      if (modos.includes(datos.contraste)) {
        this.ajustes.contraste = datos.contraste;
      }

      const escala = Number(datos.escala);

      if (escala >= 80 && escala <= 160) {
        this.ajustes.escala = escala;
      }

      const volumen = Number(datos.volumen);

      if (volumen >= 0 && volumen <= 100) {
        this.ajustes.volumen = volumen;
      }

      const velocidad = Number(datos.velocidad);

      if (velocidad >= 0.75 && velocidad <= 1.5) {
        this.ajustes.velocidad = velocidad;
      }

      this.ajustes.vozActiva =
        datos.vozActiva === true;

      this.ajustes.reducirMovimiento =
        datos.reducirMovimiento === true;

      this.ajustes.espaciarTexto =
        datos.espaciarTexto === true;

      this.ajustes.subrayarEnlaces =
        datos.subrayarEnlaces === true;

    } catch (error) {

      console.warn(
        'No se pudieron recuperar los ajustes:',
        error
      );

    }

  }

  // ========================================================
  // GUARDAR AJUSTES
  // ========================================================

  private guardarAjustes(): void {

    if (!this.esNavegador) {
      return;
    }

    try {

      sessionStorage.setItem(
        this.CLAVE,
        JSON.stringify(this.ajustes)
      );

    } catch (error) {

      console.warn(
        'No se pudieron guardar los ajustes:',
        error
      );

    }

  }

  // ========================================================
  // APLICAR AJUSTES A TODA LA APLICACIÓN
  // ========================================================

  private aplicarAjustes(): void {

    if (!this.esNavegador) {
      return;
    }

    const html = document.documentElement;

    // CSS global según el modo seleccionado.
    html.setAttribute(
      'data-vet-contraste',
      this.ajustes.contraste
    );

    html.setAttribute(
      'data-vet-movimiento',
      this.ajustes.reducirMovimiento
        ? 'reducido'
        : 'normal'
    );

    html.setAttribute(
      'data-vet-espaciado',
      this.ajustes.espaciarTexto
        ? 'amplio'
        : 'normal'
    );

    html.setAttribute(
      'data-vet-enlaces',
      this.ajustes.subrayarEnlaces
        ? 'subrayados'
        : 'normal'
    );

    // Escala toda la interfaz, incluidos textos
    // con tamaños fijados en píxeles.
    html.style.setProperty(
      'zoom',
      `${this.ajustes.escala}%`
    );

    this.guardarAjustes();

  }

  // ========================================================
  // CONTRASTE
  // ========================================================

  cambiarContraste(modo: string): void {

    const modos: ModoContraste[] = [
      'normal',
      'suave',
      'alto',
      'oscuro'
    ];

    if (!modos.includes(modo as ModoContraste)) {
      return;
    }

    this.ajustes.contraste =
      modo as ModoContraste;

    this.aplicarAjustes();

  }

  // ========================================================
  // TAMAÑO DE LA INTERFAZ
  // ========================================================

  cambiarEscala(cambio: number): void {

    const nuevaEscala =
      this.ajustes.escala + cambio;

    this.ajustes.escala = Math.min(
      160,
      Math.max(80, nuevaEscala)
    );

    this.aplicarAjustes();

  }

  // ========================================================
  // REDUCIR ANIMACIONES
  // ========================================================

  cambiarMovimiento(valor: boolean): void {

    this.ajustes.reducirMovimiento = valor;

    this.aplicarAjustes();

  }

  // ========================================================
  // ESPACIADO DE TEXTO
  // ========================================================

  cambiarEspaciado(valor: boolean): void {

    this.ajustes.espaciarTexto = valor;

    this.aplicarAjustes();

  }

  // ========================================================
  // SUBRAYAR ENLACES
  // ========================================================

  cambiarEnlaces(valor: boolean): void {

    this.ajustes.subrayarEnlaces = valor;

    this.aplicarAjustes();

  }

  // ========================================================
  // CONTROL DE VOLUMEN
  // ========================================================

  cambiarVolumen(valor: number): void {

    this.ajustes.volumen = Math.min(
      100,
      Math.max(0, valor)
    );

    this.guardarAjustes();

    // El cambio se aplica a la siguiente lectura.
  }

  // ========================================================
  // CONTROL DE VELOCIDAD
  // ========================================================

  cambiarVelocidad(valor: number): void {

    this.ajustes.velocidad = Math.min(
      1.5,
      Math.max(0.75, valor)
    );

    this.guardarAjustes();

  }

  // ========================================================
  // ACTIVAR NAVEGACIÓN HABLADA
  // ========================================================

  cambiarVozActiva(valor: boolean): void {

    if (!this.vozDisponible) {
      return;
    }

    this.ajustes.vozActiva = valor;

    this.guardarAjustes();

    if (valor) {

      // La voz se inicia por una acción del usuario.
      this.hablar(
        'Navegación hablada activada.'
      );

    } else {

      this.detenerLectura();

    }

  }

  // ========================================================
  // LEER TEXTO CON LA VOZ DEL NAVEGADOR
  // ========================================================

  private hablar(texto: string): void {

    if (
      !this.esNavegador ||
      !this.vozDisponible ||
      !texto.trim()
    ) {
      return;
    }

    // Detener cualquier lectura anterior.
    this.detenerLectura();

    // Crear una nueva lectura.
    const lectura =
      new SpeechSynthesisUtterance(
        texto.trim()
      );

    lectura.lang = 'es-EC';

    // Volumen admitido por la API: de 0 a 1.
    lectura.volume =
      this.ajustes.volumen / 100;

    lectura.rate =
      this.ajustes.velocidad;

    // Elegir una voz en español si existe.
    const voces =
      window.speechSynthesis.getVoices();

    const vozEspanol = voces.find(
      voz => voz.lang.toLowerCase() === 'es-ec'
    ) || voces.find(
      voz => voz.lang.toLowerCase().startsWith('es')
    );

    if (vozEspanol) {
      lectura.voice = vozEspanol;
    }

    this.lecturaActual = lectura;

    this.leyendo = true;
    this.mensajeVoz = 'Reproduciendo lectura...';

    // Cuando termina, actualizar el botón.
    const terminar = () => {

      if (
        this.destruido ||
        this.lecturaActual !== lectura
      ) {
        return;
      }

      this.lecturaActual = null;
      this.leyendo = false;
      this.mensajeVoz = '';

      this.cd.detectChanges();

    };

    lectura.onend = terminar;
    lectura.onerror = terminar;

    window.speechSynthesis.speak(lectura);

  }

  // ========================================================
  // LEER CONTENIDO PRINCIPAL DE LA PÁGINA
  // ========================================================

  leerPagina(): void {

    if (!this.vozDisponible) {
      return;
    }

    // Intentar localizar el contenido principal.
    const contenido =
      document.querySelector('main') ||
      document.querySelector('[role="main"]') ||
      document.querySelector('.contenido-principal') ||
      document.querySelector('.layout-contenido') ||
      document.body;

    // Leer encabezados y párrafos, no contraseñas
    // ni valores introducidos en formularios.
    const elementos = Array.from(
      contenido.querySelectorAll(
        'h1, h2, h3, p'
      )
    ).filter(
      elemento =>
        !elemento.closest(
          'app-panel-accesibilidad'
        )
    );

    const texto = elementos
      .slice(0, 35)
      .map(elemento =>
        elemento.textContent?.trim() || ''
      )
      .filter(Boolean)
      .join('. ')
      .slice(0, 2500);

    if (!texto) {

      this.mensajeVoz =
        'No se encontró texto para leer.';

      return;

    }

    this.hablar(texto);

  }

  // ========================================================
  // DETENER LECTURA
  // ========================================================

  detenerLectura(): void {

    this.lecturaActual = null;
    this.leyendo = false;

    if (
      this.esNavegador &&
      this.vozDisponible
    ) {

      window.speechSynthesis.cancel();

    }

    this.mensajeVoz = '';

  }

  // ========================================================
  // NARRAR CONTROLES DE NAVEGACIÓN
  // ========================================================

  /*
    Cuando la navegación hablada está activada,
    al utilizar un enlace o botón se anuncia
    su nombre.

    No se leen campos de contraseñas ni contenido
    introducido por el usuario.
  */

  private narrarControl(evento: Event): void {

    if (
      !this.esNavegador ||
      !this.ajustes.vozActiva
    ) {
      return;
    }

    const objetivo = evento.target;

    if (!(objetivo instanceof Element)) {
      return;
    }

    // Ignorar los controles del propio panel
    // para no interrumpir la configuración.
    if (
      objetivo.closest(
        'app-panel-accesibilidad'
      )
    ) {
      return;
    }

    const control = objetivo.closest(
      'button, a, [role="button"]'
    );

    if (!control) {
      return;
    }

    const nombre =
      control.getAttribute('aria-label') ||
      control.textContent ||
      '';

    const texto =
      nombre.replace(/\s+/g, ' ').trim();

    if (texto) {
      this.hablar(texto.slice(0, 160));
    }

  }

  // Anunciar botones y enlaces cuando se hace clic.
  @HostListener('document:click', ['$event'])
  narrarClic(evento: Event): void {

    this.narrarControl(evento);

  }

  // Anunciar controles al navegar con TAB.
  @HostListener('document:focusin', ['$event'])
  narrarFoco(evento: Event): void {

    this.narrarControl(evento);

  }

  // ========================================================
  // RESTABLECER TODOS LOS AJUSTES
  // ========================================================

  restablecer(): void {

    this.detenerLectura();

    this.ajustes = {
      contraste: 'normal',
      escala: 100,
      vozActiva: false,
      volumen: 80,
      velocidad: 1,
      reducirMovimiento: false,
      espaciarTexto: false,
      subrayarEnlaces: false
    };

    this.aplicarAjustes();

    this.mensajeVoz =
      'Se restablecieron los ajustes.';

  }

}
