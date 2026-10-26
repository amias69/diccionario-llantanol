// =============================================================================
// dibujar-emojis.js — Muestra el resultado en pantalla
// -----------------------------------------------------------------------------
// Cada emoji del diccionario se dibuja con una imagen propia, buscada por su
// id: el emoji con id "bandera-pe" se dibuja con imagenes/emojis/bandera-pe.svg.
// Así las banderas se ven igual en Windows que en el resto de sistemas.
//
// Si la imagen de un emoji no existe todavía, se muestra el emoji normal
// (como lo dibuje el sistema). Por eso la app funciona aunque la carpeta de
// imágenes esté vacía.
// =============================================================================

import { separarGrafemas } from "../nucleo/normalizar.js";
import { claveEmoji } from "../nucleo/diccionario.js";

const CARPETA_IMAGENES = "imagenes/emojis/";
const EXTENSION = ".svg";

// Ids cuya imagen ya falló al cargar. Se recuerdan para no volver a pedirla
// en cada pulsación de tecla (evita cientos de errores 404 en la consola).
const sinImagen = new Set();


/**
 * Dibuja un texto dentro de un contenedor, cambiando por imágenes los emojis
 * que están en el diccionario.
 *
 * Ejemplo con "👶 de 🐩":
 *   <img src="imagenes/emojis/bebe.svg" alt="👶"> de <img src="…/caniche.svg" alt="🐩">
 *
 * Seguridad: el texto se inserta como texto (createTextNode), nunca como HTML.
 * Así, si alguien escribe "<script>", se muestra literalmente y no se ejecuta.
 *
 * @param {HTMLElement} contenedor - Donde se dibuja el resultado.
 * @param {string} texto - El resultado de la traducción.
 * @param {object} diccionario - El diccionario creado por crearDiccionario().
 */
export function dibujarResultado(contenedor, texto, diccionario) {
  // Un DocumentFragment es un contenedor temporal fuera de la página.
  // Se arma todo ahí y se inserta de una vez, que es más rápido que añadir
  // elemento por elemento a la página.
  const fragmento = document.createDocumentFragment();
  let textoPendiente = "";

  // Inserta el texto normal acumulado y lo vacía.
  const volcarTexto = () => {
    if (textoPendiente) {
      fragmento.append(document.createTextNode(textoPendiente));
      textoPendiente = "";
    }
  };

  for (const grafema of separarGrafemas(texto)) {
    const entrada = diccionario.porEmoji.get(claveEmoji(grafema));

    if (entrada && !sinImagen.has(entrada.id)) {
      volcarTexto();
      fragmento.append(crearEmoji(entrada));
    } else {
      textoPendiente += grafema;
    }
  }
  volcarTexto();

  // replaceChildren borra lo anterior y pone lo nuevo.
  contenedor.replaceChildren(fragmento);
}


/**
 * Crea el elemento que dibuja un emoji del diccionario.
 * Se usa aquí y también en el selector de emojis (selector-emojis.js).
 *
 * Si ya se sabe que su imagen no existe, devuelve directamente el emoji como
 * texto. Si no, devuelve una imagen con estas propiedades:
 * - alt: el emoji original. Lo leen los lectores de pantalla y aparece si
 *   el usuario selecciona y copia el resultado con el ratón.
 * - draggable=false: evita arrastrar la imagen por accidente.
 * - onerror: si la imagen no existe, la reemplaza por el emoji en texto y
 *   apunta el id para no volver a intentarlo.
 *
 * @param {{id: string, emoji: string}} entrada
 * @returns {HTMLImageElement | Text}
 */
export function crearEmoji(entrada) {
  if (sinImagen.has(entrada.id)) {
    return document.createTextNode(entrada.emoji);
  }

  const img = document.createElement("img");
  img.className = "emoji";
  img.src = CARPETA_IMAGENES + entrada.id + EXTENSION;
  img.alt = entrada.emoji;
  img.draggable = false;
  // "lazy": el navegador solo descarga la imagen cuando está a punto de
  // verse. Importa en el selector, donde una pestaña puede tener cientos de
  // emojis y la mayoría quedan fuera de la vista hasta que se desplaza.
  img.loading = "lazy";

  img.addEventListener("error", () => {
    sinImagen.add(entrada.id);
    img.replaceWith(document.createTextNode(entrada.emoji));
  }, { once: true });

  return img;
}
