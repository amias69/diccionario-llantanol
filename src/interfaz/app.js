// =============================================================================
// app.js — Punto de entrada de la interfaz
// -----------------------------------------------------------------------------
// Es el "pegamento" entre la pantalla y el núcleo:
//   1. Carga el diccionario desde datos/diccionario.json.
//   2. Escucha lo que hace el usuario (escribir, intercambiar, copiar, borrar).
//   3. Le pide la traducción al núcleo y la muestra.
//
// Aquí no hay lógica de traducción: si mañana cambia cómo se traduce, este
// archivo no se toca.
// =============================================================================

import { crearDiccionario } from "../nucleo/diccionario.js";
import { separarGrafemas } from "../nucleo/normalizar.js";
import { textoAEmojis, emojisATexto } from "../nucleo/traductor.js";
import { dibujarResultado } from "./dibujar-emojis.js";
import { crearSelector } from "./selector-emojis.js";

const RUTA_DICCIONARIO = "datos/diccionario.json";

// Las dos direcciones posibles. Cada una sabe qué función del núcleo usar y
// qué nombres mostrar en la barra de idiomas.
const DIRECCIONES = {
  "a-emojis": { traducir: textoAEmojis, origen: "Español", destino: "Llantañol", siguiente: "a-texto" },
  "a-texto": { traducir: emojisATexto, origen: "Llantañol", destino: "Español", siguiente: "a-emojis" },
};

// Estado de la app: todo lo que puede cambiar mientras se usa.
const estado = {
  direccion: "a-emojis",
  diccionario: null, // se rellena al cargar el archivo
  resultado: "",     // último resultado, en texto (es lo que se copia)
};

// Elementos de la página que se usan. Se buscan una sola vez.
const ui = {
  entrada: document.getElementById("entrada"),
  salida: document.getElementById("salida"),
  origen: document.getElementById("idioma-origen"),
  destino: document.getElementById("idioma-destino"),
  intercambiar: document.getElementById("intercambiar"),
  copiar: document.getElementById("copiar"),
  limpiar: document.getElementById("limpiar"),
  contador: document.getElementById("contador"),
  aviso: document.getElementById("aviso"),
  selector: document.getElementById("selector"),
  mostrarSelector: document.getElementById("mostrar-selector"),
};

// true en computadoras con ratón; false en pantallas táctiles.
// Se usa para decidir si devolver el foco al campo de texto (ver insertarEmoji).
const tieneRaton = window.matchMedia("(pointer: fine)").matches;


/**
 * Arranca la app: carga el diccionario y conecta los botones.
 *
 * Es async porque cargar el archivo tarda un momento; "await" espera a que
 * termine antes de seguir. Si algo falla (el archivo no existe, el JSON está
 * mal escrito o el diccionario tiene errores), se muestra el motivo en
 * pantalla y la app no se activa.
 */
async function iniciar() {
  try {
    const respuesta = await fetch(RUTA_DICCIONARIO);
    if (!respuesta.ok) {
      throw new Error(`No se encontró ${RUTA_DICCIONARIO} (error ${respuesta.status}).`);
    }
    const entradas = await respuesta.json();
    estado.diccionario = crearDiccionario(entradas);
  } catch (error) {
    mostrarAviso(error.message, { esError: true });
    ui.entrada.disabled = true;
    console.error(error);
    return;
  }

  // "input" se dispara con cada cambio en el campo: tecla, pegar, borrar...
  // Eso es lo que da la traducción en tiempo real.
  ui.entrada.addEventListener("input", traducir);
  ui.intercambiar.addEventListener("click", intercambiar);
  ui.copiar.addEventListener("click", copiar);
  ui.limpiar.addEventListener("click", limpiar);
  ui.mostrarSelector.addEventListener("click", () => mostrarSelector(ui.selector.hidden));

  // El selector se construye una sola vez; luego solo se muestra u oculta.
  crearSelector(ui.selector, estado.diccionario, { alElegir: insertarEmoji });

  actualizarIdiomas();
  traducir();
}


/**
 * Traduce lo que hay en el campo de entrada y muestra el resultado.
 * Se llama cada vez que el usuario escribe.
 */
function traducir() {
  const texto = ui.entrada.value;
  const { traducir: funcion } = DIRECCIONES[estado.direccion];

  estado.resultado = funcion(texto, estado.diccionario);
  dibujarResultado(ui.salida, estado.resultado, estado.diccionario);

  // Se cuentan grafemas (caracteres visibles): .length contaría piezas
  // internas, y una bandera como 🇵🇪 valdría 4 en lugar de 1.
  const total = separarGrafemas(texto).length;
  ui.contador.textContent = `${total} ${total === 1 ? "carácter" : "caracteres"}`;
}


/**
 * Cambia la dirección de traducción. Como en el traductor de Google, el
 * resultado actual pasa al campo de entrada para traducirlo de vuelta.
 */
function intercambiar() {
  estado.direccion = DIRECCIONES[estado.direccion].siguiente;
  ui.entrada.value = estado.resultado;
  actualizarIdiomas();
  traducir();
  ui.entrada.focus();
}


/**
 * Copia el resultado al portapapeles.
 *
 * Se copia el texto (con los emojis reales), no las imágenes, para que se
 * pueda pegar en cualquier aplicación.
 * navigator.clipboard solo funciona en páginas seguras (https o localhost);
 * por eso se protege con try/catch.
 */
async function copiar() {
  if (!estado.resultado) return;
  try {
    await navigator.clipboard.writeText(estado.resultado);
    mostrarAviso("Copiado");
  } catch {
    mostrarAviso("No se pudo copiar", { esError: true });
  }
}


/** Vacía el campo de entrada y el resultado. */
function limpiar() {
  ui.entrada.value = "";
  traducir();
  ui.entrada.focus();
}


/**
 * Pone en la barra los nombres de los idiomas según la dirección actual.
 *
 * También decide si se ofrece el selector de emojis: solo tiene sentido al
 * escribir en llantañol. Al escribir en español, los emojis se eliminarían al
 * normalizar el texto, así que el botón se oculta y el selector se cierra.
 */
function actualizarIdiomas() {
  const { origen, destino } = DIRECCIONES[estado.direccion];
  const escribeLlantanol = origen === "Llantañol";

  ui.origen.textContent = origen;
  ui.destino.textContent = destino;
  ui.entrada.placeholder = escribeLlantanol ? "Escribe o elige emojis…" : "Escribe aquí…";

  ui.mostrarSelector.hidden = !escribeLlantanol;
  mostrarSelector(escribeLlantanol);
}


/**
 * Muestra u oculta el selector de emojis.
 * aria-expanded le dice a los lectores de pantalla si el panel está abierto.
 *
 * @param {boolean} visible
 */
function mostrarSelector(visible) {
  ui.selector.hidden = !visible;
  ui.mostrarSelector.setAttribute("aria-expanded", String(visible));
}


/**
 * Inserta el emoji elegido en el campo de entrada, donde está el cursor.
 *
 * setRangeText reemplaza el texto seleccionado (o, si no hay selección,
 * inserta en la posición del cursor) y "end" deja el cursor justo después
 * del emoji, listo para seguir escribiendo.
 *
 * Cambiar el valor desde código no dispara el evento "input", así que se
 * llama a traducir() a mano.
 *
 * Solo con ratón se devuelve el foco al campo: en el celular, enfocarlo
 * abriría el teclado y taparía el selector.
 *
 * @param {{emoji: string}} entrada
 */
function insertarEmoji(entrada) {
  const { selectionStart, selectionEnd } = ui.entrada;
  ui.entrada.setRangeText(entrada.emoji, selectionStart, selectionEnd, "end");
  traducir();
  if (tieneRaton) ui.entrada.focus();
}


// Temporizador del aviso, para poder reiniciarlo si llega otro aviso antes.
let temporizadorAviso;

/**
 * Muestra un mensaje breve bajo el resultado.
 * Los avisos normales desaparecen a los 2 segundos; los errores se quedan.
 *
 * @param {string} mensaje
 * @param {{esError?: boolean}} [opciones]
 */
function mostrarAviso(mensaje, { esError = false } = {}) {
  clearTimeout(temporizadorAviso);
  ui.aviso.textContent = mensaje;
  ui.aviso.classList.toggle("es-error", esError);
  if (!esError) {
    temporizadorAviso = setTimeout(() => (ui.aviso.textContent = ""), 2000);
  }
}


iniciar();
