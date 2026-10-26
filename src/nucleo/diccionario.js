// =============================================================================
// diccionario.js — Validación y preparación del diccionario
// -----------------------------------------------------------------------------
// Recibe la lista de entradas (lo que hay en datos/diccionario.json) y la
// convierte en una estructura lista para traducir rápido en ambas direcciones.
//
// Este archivo NO lee el archivo JSON: eso lo hace la interfaz y le pasa los
// datos ya cargados. Así el núcleo no depende de dónde se guarda el diccionario.
//
// Cada entrada tiene cuatro campos:
//   id        → nombre único y técnico; sirve para encontrar la imagen del emoji.
//   emoji     → el emoji en sí.
//   texto     → la cadena de texto que representa (ya normalizada).
//   categoria → grupo al que pertenece (ver CATEGORIAS); lo usa el selector
//               de emojis para repartirlos en pestañas.
//
// Las variantes de tono de piel no llevan texto ni categoría (los heredan de
// su emoji base) y en su lugar tienen:
//   base      → id del emoji sin tono (👍🏽 tiene como base a 👍).
//   tono      → 1 (claro) a 5 (oscuro); o una lista como [1, 4] en emojis de
//               dos personas con tonos distintos (🧑🏻‍🤝‍🧑🏾).
// =============================================================================

import { normalizar, separarGrafemas } from "./normalizar.js";


/**
 * Categorías válidas, en el orden en que deben mostrarse.
 *
 * Son los mismos grupos que usa el estándar Unicode (y por eso también GNOME,
 * WhatsApp y los teclados de los celulares). Seguir ese estándar ayuda a que
 * cualquiera encuentre un emoji donde espera.
 *
 * Aquí solo están los identificadores. Los nombres visibles y los iconos de
 * cada pestaña son cosa de la interfaz (ver selector-emojis.js).
 */
export const CATEGORIAS = [
  "caras",       // Caritas y emociones: 😂 ❤️ 💀
  "gente",       // Gente y cuerpo: 👶 👍 🙏
  "animales",    // Animales y naturaleza: 🐩 🌹
  "comida",      // Comida y bebida: 🎂
  "viajes",      // Viajes, lugares y clima: 🏠 ☀️ 🔥
  "actividades", // Actividades y celebraciones: 🎉 🎁
  "objetos",     // Objetos: 👑 💰
  "simbolos",    // Símbolos: ✅
  "banderas",    // Banderas: 🇵🇪
];


/**
 * Devuelve la "clave de búsqueda" de un emoji.
 *
 * Algunos emojis existen en dos versiones casi idénticas: con y sin un
 * carácter invisible llamado "selector de variación" (U+FE0F), que le pide al
 * sistema dibujarlo a color. Por ejemplo, "☀️" y "☀" son el mismo sol, pero
 * para el ordenador son textos distintos. Si alguien pega uno y el diccionario
 * tiene el otro, no coincidirían.
 *
 * Para evitarlo, quitamos ese carácter invisible antes de comparar.
 *
 * @param {string} emoji
 * @returns {string} El emoji sin selectores de variación.
 */
export function claveEmoji(emoji) {
  return emoji.replace(/\uFE0F/g, "");
}


/**
 * Valida las entradas y crea el diccionario listo para usar.
 *
 * Hay dos tipos de entrada:
 *   - Emoji base: tiene su propio texto y categoría.
 *       { "id": "biceps", "emoji": "💪", "texto": "brazo", "categoria": "gente" }
 *   - Variante de tono: NO tiene texto ni categoría; los hereda de su base.
 *       { "id": "biceps-tono-3", "emoji": "💪🏽", "base": "biceps", "tono": 3 }
 *     Así, al cambiar el texto de 💪, sus cinco variantes cambian con él.
 *
 * Reglas que comprueba (si alguna falla, lanza un error con TODOS los
 * problemas encontrados, para corregirlos de una sola vez):
 *   - Toda entrada tiene id y emoji.
 *   - El id solo usa minúsculas, números y guiones (será un nombre de archivo).
 *   - El emoji es un solo carácter visible.
 *   - Un emoji base tiene texto y categoría. El texto ya está normalizado
 *     (sin mayúsculas, tildes ni espacios; si no, nunca coincidiría) y la
 *     categoría es una de las de CATEGORIAS.
 *   - Una variante tiene base (el id de un emoji base que existe) y tono
 *     (del 1 al 5, o una lista de ellos), y no tiene texto ni categoría.
 *   - Ningún id ni emoji se repite, y ningún texto se repite entre los
 *     emojis base. Varios emojis (💪 💪🏻 … 💪🏿) pueden dar el mismo texto al
 *     traducir a español; al traducir a emojis, "brazo" da siempre la base 💪.
 *     Así ninguna de las dos direcciones es ambigua.
 *
 * @param {Array<object>} entradas - Tal como están en diccionario.json.
 * @returns {{
 *   entradas: Array<{id: string, emoji: string, texto: string, categoria: string}>,
 *   porTexto: Map<string, object>,
 *   porEmoji: Map<string, object>,
 *   textosOrdenados: string[]
 * }}
 *   - entradas: las mismas entradas, pero las variantes ya llevan copiados
 *     el texto y la categoría de su base.
 *   - porTexto: busca un emoji base a partir de su texto ("pe" → entrada 🇵🇪).
 *   - porEmoji: busca cualquier entrada a partir de su emoji (🇵🇪 → "pe";
 *     💪🏽 → "brazo").
 *   - textosOrdenados: todos los textos, del más largo al más corto. El
 *     traductor los prueba en ese orden para encontrar siempre la
 *     coincidencia más larga.
 *   - porInicial: los mismos textos agrupados por su primera letra
 *     ("l" → ["lunanueva", "luna", ...]), también de largo a corto. Ver
 *     textoAEmojis en traductor.js para saber por qué existe.
 */
export function crearDiccionario(entradas) {
  if (!Array.isArray(entradas)) {
    throw new Error("El diccionario debe ser una lista de entradas: [ {...}, {...} ]");
  }

  const errores = [];
  const porTexto = new Map();
  const ids = new Set();
  const emojis = new Set();
  const bases = new Map(); // id → entrada, solo emojis base

  // Comprueba que un campo sea un texto no vacío.
  const esTexto = (valor) => typeof valor === "string" && valor.trim() !== "";

  // --- Primera vuelta: revisar cada entrada por separado -------------------
  entradas.forEach((entrada, posicion) => {
    // Número de entrada contando desde 1, para que el mensaje sea más humano.
    const n = `Entrada ${posicion + 1}`;
    const { id, emoji, texto, categoria } = entrada ?? {};
    const esVariante = entrada?.base !== undefined;

    // 1. Campos obligatorios según el tipo. Si falta alguno, no tiene
    //    sentido seguir revisando esta entrada.
    const obligatorios = esVariante ? ["id", "emoji", "base"] : ["id", "emoji", "texto", "categoria"];
    const faltan = obligatorios.filter((campo) => !esTexto(entrada?.[campo]));
    if (faltan.length > 0) {
      errores.push(`${n}: falta ${faltan.join(", ")}.`);
      return;
    }

    // 2. Formato del id.
    if (!/^[a-z0-9-]+$/.test(id)) {
      errores.push(`${n} ("${id}"): el id solo puede tener minúsculas, números y guiones.`);
    }

    // 3. El emoji debe ser un solo grafema (ver separarGrafemas).
    if (separarGrafemas(emoji).length !== 1) {
      errores.push(`${n} ("${id}"): "${emoji}" debe ser un solo emoji.`);
    }

    // 4. Id y emoji no repetidos.
    if (ids.has(id)) errores.push(`${n}: el id "${id}" está repetido.`);
    if (emojis.has(claveEmoji(emoji))) errores.push(`${n} ("${id}"): el emoji ${emoji} está repetido.`);
    ids.add(id);
    emojis.add(claveEmoji(emoji));

    if (esVariante) {
      // 5a. Variante: tono válido y sin texto ni categoría propios.
      const tonos = Array.isArray(entrada.tono) ? entrada.tono : [entrada.tono];
      if (tonos.length === 0 || !tonos.every((t) => Number.isInteger(t) && t >= 1 && t <= 5)) {
        errores.push(`${n} ("${id}"): el tono debe ser un número del 1 al 5 o una lista de ellos.`);
      }
      if (texto !== undefined || categoria !== undefined) {
        errores.push(
          `${n} ("${id}"): una variante de tono no lleva texto ni categoría; los toma de su base "${entrada.base}".`
        );
      }
      return;
    }

    // 5b. Emoji base: texto normalizado y no repetido, categoría existente.
    const textoNormalizado = normalizar(texto);
    if (texto !== textoNormalizado) {
      errores.push(
        `${n} ("${id}"): el texto "${texto}" debe escribirse normalizado: "${textoNormalizado}".`
      );
    }
    if (porTexto.has(texto)) errores.push(`${n} ("${id}"): el texto "${texto}" está repetido.`);
    if (!CATEGORIAS.includes(categoria)) {
      errores.push(
        `${n} ("${id}"): la categoría "${categoria}" no existe. Usa una de: ${CATEGORIAS.join(", ")}.`
      );
    }

    porTexto.set(texto, entrada);
    bases.set(id, entrada);
  });

  // --- Segunda vuelta: cada variante debe apuntar a un emoji base ---------
  // Se hace aparte porque la base puede aparecer en el archivo después de
  // su variante.
  entradas.forEach((entrada, posicion) => {
    if (esTexto(entrada?.base) && !bases.has(entrada.base)) {
      errores.push(
        `Entrada ${posicion + 1} ("${entrada.id}"): la base "${entrada.base}" no existe o no es un emoji base.`
      );
    }
  });

  if (errores.length > 0) {
    throw new Error("El diccionario tiene errores:\n- " + errores.join("\n- "));
  }

  // --- Completar las variantes con el texto y la categoría de su base -----
  // Se crean copias para no modificar los datos originales.
  const completas = entradas.map((entrada) => {
    if (entrada.base === undefined) return entrada;
    const base = bases.get(entrada.base);
    return { ...entrada, texto: base.texto, categoria: base.categoria };
  });

  const porEmoji = new Map(completas.map((e) => [claveEmoji(e.emoji), e]));

  // Orden de mayor a menor longitud: así "perra" se prueba antes que "pe".
  const textosOrdenados = [...porTexto.keys()].sort((a, b) => b.length - a.length);

  // Agrupa por primera letra conservando ese orden.
  const porInicial = new Map();
  for (const texto of textosOrdenados) {
    const inicial = texto[0];
    if (!porInicial.has(inicial)) porInicial.set(inicial, []);
    porInicial.get(inicial).push(texto);
  }

  return { entradas: completas, porTexto, porEmoji, textosOrdenados, porInicial };
}
