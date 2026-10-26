// =============================================================================
// traductor.js — Traducción en las dos direcciones
// -----------------------------------------------------------------------------
//   textoAEmojis("Hijo de perra", dic) → "👶 de 🐩"
//   emojisATexto("👶 de 🐩", dic)       → "Hijo de perra"
//
// Ambas funciones reciben el diccionario ya preparado por crearDiccionario()
// (ver diccionario.js) y devuelven texto. No tocan la pantalla.
// =============================================================================

import { normalizar, separarGrafemas } from "./normalizar.js";
import { claveEmoji } from "./diccionario.js";


/**
 * Traduce de texto a llantañol (emojis).
 *
 * Funciona en tres pasos:
 *
 *   1. UNIR. Normaliza el texto y quita los espacios, pero anota dónde
 *      estaba cada uno (ver separarEspacios):
 *        "alamos cabrazo" → "alamoscabrazo", con un espacio en la posición 6
 *
 *   2. TRADUCIR con la "coincidencia más larga". Se recorre el texto unido de
 *      izquierda a derecha; en cada posición se prueban los textos del
 *      diccionario que empiezan por esa letra, del más largo al más corto,
 *      y se usa el primero que encaja:
 *        - Si encaja uno: se escribe su emoji y se salta tantas letras como mide.
 *        - Si no: se copia la letra tal cual y se avanza una.
 *      Al estar todo unido, un reemplazo puede cruzar de una palabra a otra:
 *        "ala" → 🪽 · "mos|ca" → 🪰 · "brazo" → 💪
 *      Por qué lo más largo primero: si "pe" se probara antes que "perra",
 *      "perra" quedaría como 🇵🇪 + "rra" en vez de 🐩.
 *
 *   3. DEVOLVER LOS ESPACIOS a su sitio original. Si un espacio quedó dentro
 *      de un trozo reemplazado (el de "mos|ca"), se coloca justo después de
 *      ese emoji, para que el texto conserve sus separaciones:
 *        "alamos cabrazo" → "🪽🪰 💪"
 *
 * Al final, la primera letra va en mayúscula.
 *
 * @param {string} texto - Texto en español escrito por el usuario.
 * @param {ReturnType<import("./diccionario.js").crearDiccionario>} diccionario
 * @returns {string} El texto en llantañol.
 */
export function textoAEmojis(texto, diccionario) {
  // Paso 1: unir.
  const { unido, espacios } = separarEspacios(normalizar(texto, { conservarEspacios: true }));

  let resultado = "";
  let i = 0;

  while (i < unido.length) {
    // Paso 3 (parte 1): si en el texto original había un espacio justo antes
    // de esta letra, se escribe aquí.
    if (espacios.has(i)) resultado += espacios.get(i);

    // Paso 2: buscar la coincidencia más larga que empieza en la posición i.
    const candidatos = diccionario.porInicial.get(unido[i]) ?? [];
    const coincidencia = candidatos.find((t) => unido.startsWith(t, i));

    if (!coincidencia) {
      resultado += unido[i];
      i += 1;
      continue;
    }

    resultado += diccionario.porTexto.get(coincidencia).emoji;
    const fin = i + coincidencia.length;

    // Paso 3 (parte 2): espacios "tragados" por el reemplazo, es decir, los
    // que estaban entre la segunda y la última letra del trozo. Se escriben
    // después del emoji, salvo que ya venga un espacio justo después (así no
    // se duplica) o que el texto termine ahí.
    const tragado = espacioTragado(espacios, i + 1, fin);
    if (tragado && !espacios.has(fin) && fin < unido.length) {
      resultado += tragado;
    }

    i = fin;
  }

  return capitalizar(resultado);
}


/**
 * Separa un texto normalizado en letras y espacios (función interna).
 *
 * Devuelve:
 *   - unido:    el texto sin espacios.
 *   - espacios: un mapa "posición → espacio". La posición indica delante de
 *               qué letra del texto unido iba el espacio.
 *
 * Ejemplo con "hijo de perra":
 *   unido    = "hijodeperra"
 *   espacios = { 4 → " ", 6 → " " }   (delante de la "d" y de la "p")
 *
 * Los espacios del principio y del final se descartan.
 *
 * @param {string} texto - Texto ya normalizado con conservarEspacios.
 * @returns {{unido: string, espacios: Map<number, string>}}
 */
function separarEspacios(texto) {
  let unido = "";
  const espacios = new Map();

  for (const caracter of texto.trim()) {
    if (caracter === " " || caracter === "\n") {
      espacios.set(unido.length, caracter);
    } else {
      unido += caracter;
    }
  }
  return { unido, espacios };
}


/**
 * Busca espacios entre las posiciones desde (incluida) y hasta (excluida)
 * (función interna). Si hay varios, devuelve uno solo: un salto de línea si
 * alguno lo era, para no perder párrafos; si no, un espacio. Si no hay
 * ninguno, devuelve null.
 *
 * @param {Map<number, string>} espacios
 * @param {number} desde
 * @param {number} hasta
 * @returns {string | null}
 */
function espacioTragado(espacios, desde, hasta) {
  let encontrado = null;
  for (let p = desde; p < hasta; p++) {
    const espacio = espacios.get(p);
    if (espacio === "\n") return "\n";
    if (espacio) encontrado = espacio;
  }
  return encontrado;
}


/**
 * Traduce de llantañol (emojis) a texto.
 *
 * Funcionamiento:
 *   1. Parte el texto en grafemas para no romper emojis (ver separarGrafemas).
 *   2. Cada emoji que está en el diccionario se cambia por su texto.
 *   3. Los emojis que NO están en el diccionario se dejan tal cual, para que
 *      el usuario vea que hay algo que no se pudo traducir.
 *   4. El resto de caracteres (letras, espacios, signos) se normaliza
 *      conservando los espacios: "¡De!" → "de".
 *   5. Se quitan espacios dobles y de los extremos, y la primera letra va en
 *      mayúscula.
 *
 * Los espacios se respetan tal como están: "👶 de 🐩" → "Hijo de perra",
 * pero "❤️🐩" (sin espacio) → "Corazonperra". La vuelta no siempre recupera
 * el texto original, porque un emoji puede haber "tragado" un espacio:
 * "🪽🪰 💪" vuelve como "Alamosca brazo".
 *
 * @param {string} texto - Texto en llantañol.
 * @param {ReturnType<import("./diccionario.js").crearDiccionario>} diccionario
 * @returns {string} El texto en español.
 */
export function emojisATexto(texto, diccionario) {
  let resultado = "";
  // Acumula caracteres normales seguidos para normalizarlos juntos.
  let pendiente = "";

  for (const grafema of separarGrafemas(texto)) {
    const entrada = diccionario.porEmoji.get(claveEmoji(grafema));

    if (entrada) {
      resultado += normalizar(pendiente, { conservarEspacios: true }) + entrada.texto;
      pendiente = "";
    } else if (esEmoji(grafema)) {
      // Emoji desconocido: se conserva sin cambios.
      resultado += normalizar(pendiente, { conservarEspacios: true }) + grafema;
      pendiente = "";
    } else {
      pendiente += grafema;
    }
  }
  resultado += normalizar(pendiente, { conservarEspacios: true });

  // Al normalizar por tramos pueden quedar espacios dobles o en los bordes.
  resultado = resultado.replace(/ {2,}/g, " ").trim();

  return capitalizar(resultado);
}


/**
 * Indica si un grafema es un emoji (función interna).
 *
 * \p{Extended_Pictographic} reconoce casi todos los emojis (👶, 🐩, ☀️...).
 * \p{Regional_Indicator} reconoce las "letras regionales" con las que se
 * forman las banderas (🇵🇪 = 🇵 + 🇪).
 *
 * @param {string} grafema
 * @returns {boolean}
 */
function esEmoji(grafema) {
  return /\p{Extended_Pictographic}|\p{Regional_Indicator}/u.test(grafema);
}


/**
 * Pone en mayúscula la primera letra del texto (función interna).
 *
 * Solo actúa si el texto empieza por una letra. Si empieza por un emoji
 * ("👶 de 🐩"), se deja igual: no tiene sentido buscar la siguiente letra.
 *
 * @param {string} texto
 * @returns {string}
 */
function capitalizar(texto) {
  if (texto === "") return texto;
  return texto[0].toUpperCase() + texto.slice(1);
}
