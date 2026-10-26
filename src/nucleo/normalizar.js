// =============================================================================
// normalizar.js — Utilidades de texto del núcleo
// -----------------------------------------------------------------------------
// Este archivo no sabe nada de la interfaz: solo recibe texto y devuelve texto.
// Contiene dos herramientas que usa el resto del núcleo:
//   1. normalizar()      → deja el texto "limpio" para poder traducirlo.
//   2. separarGrafemas() → parte un texto en caracteres visibles, sin romper
//                          emojis compuestos como las banderas.
// =============================================================================


/**
 * Deja un texto en su forma estándar para traducir.
 *
 * Pasos que aplica:
 *   1. Lo pasa a minúsculas.
 *   2. Quita tildes, diéresis y otras marcas (á → a, ü → u), pero conserva la ñ.
 *   3. Elimina todo lo que no sea letra (a-z, ñ) o número: signos de
 *      puntuación, símbolos y emojis.
 *   4. Elimina los espacios (o los conserva, según la opción).
 *
 * Ejemplos:
 *   normalizar("¡Hijo de Perra!")                         → "hijodeperra"
 *   normalizar("Pingüino Ñandú")                          → "pinguinoñandu"
 *   normalizar("Pingüino Ñandú", { conservarEspacios: true }) → "pinguino ñandu"
 *
 * @param {string} texto - El texto tal como lo escribió el usuario.
 * @param {object} [opciones]
 * @param {boolean} [opciones.conservarEspacios=false] - Si es true, cada grupo
 *        de espacios en blanco se reduce a un solo carácter en lugar de
 *        eliminarse: un salto de línea si el grupo tenía alguno (para no
 *        perder los párrafos), o un espacio si no.
 * @returns {string} El texto normalizado.
 */
export function normalizar(texto, { conservarEspacios = false } = {}) {
  // Paso previo: NFC "junta" letras que vengan escritas en dos piezas.
  // Por ejemplo, una ñ puede llegar como "n" + "~" (dos caracteres invisibles
  // al ojo); NFC la convierte en una sola "ñ" para que el paso siguiente la
  // reconozca.
  const minusculas = texto.normalize("NFC").toLowerCase();

  // Truco para conservar la ñ: el método para quitar tildes (ver limpiarParte)
  // también convertiría la ñ en n, porque para el ordenador la ñ es una "n con
  // una marca encima". Así que cortamos el texto en cada ñ, limpiamos los
  // pedazos por separado y luego los volvemos a unir con la ñ intacta.
  //   "pingüino ñandú" → ["pingüino ", "andú"] → ["pinguino ", "andu"] → "pinguino ñandu"
  const limpio = minusculas
    .split("ñ")
    .map((parte) => limpiarParte(parte, conservarEspacios))
    .join("ñ");

  return limpio;
}


/**
 * Limpia un pedazo de texto que ya no contiene ñ (función interna).
 *
 * Cómo quita las tildes: NFD separa cada letra de su marca ("á" pasa a ser
 * "a" + "´"). Después, la expresión /\p{M}/gu borra todas las marcas
 * (la categoría Unicode "M" agrupa tildes, diéresis, virgulillas, etc.).
 *
 * @param {string} parte
 * @param {boolean} conservarEspacios
 * @returns {string}
 */
function limpiarParte(parte, conservarEspacios) {
  let resultado = parte.normalize("NFD").replace(/\p{M}/gu, "");

  if (conservarEspacios) {
    // \s+ = uno o más espacios en blanco seguidos → un solo carácter.
    resultado = resultado.replace(/\s+/g, (grupo) => (grupo.includes("\n") ? "\n" : " "));
    // Deja solo letras, números, espacios y saltos de línea.
    resultado = resultado.replace(/[^a-z0-9 \n]/g, "");
  } else {
    // Deja solo letras y números (los espacios también desaparecen).
    resultado = resultado.replace(/[^a-z0-9]/g, "");
  }

  return resultado;
}


// Segmentador reutilizable. Se crea una sola vez porque crearlo es costoso
// y se usa en cada traducción.
const segmentador = new Intl.Segmenter("es", { granularity: "grapheme" });

/**
 * Parte un texto en "grafemas": los caracteres tal como los ve una persona.
 *
 * ¿Por qué no basta con recorrer el texto letra por letra? Porque JavaScript
 * guarda muchos emojis como varias piezas internas. Una bandera como 🇵🇪
 * son en realidad dos "letras regionales" (🇵 y 🇪), y cada una ocupa dos
 * unidades de memoria: cuatro piezas en total. Si las recorriéramos una por
 * una, partiríamos la bandera y saldrían símbolos rotos.
 *
 * Intl.Segmenter es la herramienta del navegador que sabe dónde empieza y
 * termina cada carácter visible, así que 🇵🇪 sale como un único elemento.
 *
 * Ejemplo:
 *   separarGrafemas("🇪🇸🇵🇪 cial") → ["🇪🇸", "🇵🇪", " ", "c", "i", "a", "l"]
 *
 * @param {string} texto
 * @returns {string[]} Lista de grafemas en orden.
 */
export function separarGrafemas(texto) {
  return Array.from(segmentador.segment(texto), (trozo) => trozo.segment);
}
