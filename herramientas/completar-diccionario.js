// =============================================================================
// completar-diccionario.js — Añade al diccionario todos los emojis que faltan
// -----------------------------------------------------------------------------
// Herramienta de desarrollo: no forma parte de la app. Se ejecuta a mano:
//
//     npm run completar
//
// Qué hace:
//   1. Lee la lista oficial de emojis en español del paquete emojibase-data
//      (nombre, categoría y variantes de tono de piel de cada emoji).
//   2. Lee datos/diccionario.json.
//   3. Añade los emojis que todavía no están, usando su nombre oficial como
//      texto:  🌙 "luna" → texto "luna".
//      Las variantes de tono de piel se añaden sin texto: lo heredan de su
//      emoji base (💪🏽 significa lo mismo que 💪).
//   4. NUNCA cambia los significados que ya existen: si le diste a 🐩 el
//      texto "perra", lo conserva. Por eso se puede ejecutar tantas veces como
//      se quiera sin perder cambios hechos a mano. (Lo único que corrige son
//      variantes antiguas que aún tenían texto propio: se lo quita para que
//      hereden el de su base.)
//   5. Guarda el diccionario ordenado como lo ordena Unicode (el mismo orden
//      que muestran GNOME y WhatsApp).
//
// Después hay que ejecutar "npm run imagenes" para copiar las imágenes nuevas.
// =============================================================================

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { normalizar } from "../src/nucleo/normalizar.js";
import { claveEmoji } from "../src/nucleo/diccionario.js";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const DICCIONARIO = join(RAIZ, "datos", "diccionario.json");
const EMOJIBASE = join(RAIZ, "node_modules", "emojibase-data", "es", "data.json");
const TWEMOJI = join(RAIZ, "node_modules", "@twemoji", "svg");

// Grupos de emojibase (números) → nuestras categorías (ver CATEGORIAS en
// diccionario.js). El grupo 2, "componentes" (tonos de piel sueltos, tipos
// de pelo), no se incluye: no son emojis completos.
const CATEGORIA_POR_GRUPO = {
  0: "caras",
  1: "gente",
  3: "animales",
  4: "comida",
  5: "viajes",
  6: "actividades",
  7: "objetos",
  8: "simbolos",
  9: "banderas",
};


/**
 * Convierte el código de emojibase en el emoji.
 *
 * emojibase describe cada emoji con sus códigos Unicode en hexadecimal:
 * "1F44D-1F3FB" → 👍🏻. Construirlo desde los códigos da la forma oficial
 * del emoji, sin caracteres invisibles de más.
 *
 * @param {string} hexcode
 * @returns {string}
 */
function emojiDesdeCodigo(hexcode) {
  return String.fromCodePoint(...hexcode.split("-").map((h) => parseInt(h, 16)));
}


/**
 * Crea un id a partir del nombre oficial.
 *   "pulgar hacia arriba: tono de piel claro" → "pulgar-hacia-arriba-tono-de-piel-claro"
 * Igual que normalizar(), pero cambia la ñ por n y los espacios por guiones,
 * porque el id será un nombre de archivo.
 *
 * @param {string} nombre
 * @returns {string}
 */
function idDesdeNombre(nombre) {
  return nombre
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "") // quita tildes; aquí la ñ también pasa a n
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}


/**
 * Devuelve un valor que no esté en "usados", añadiendo un número si hace
 * falta: "luna" → "luna2" → "luna3"... y lo marca como usado.
 * Se usa para que ningún id ni texto se repita (regla de oro del diccionario).
 *
 * @param {string} valor
 * @param {Set<string>} usados
 * @param {string} separador - "-" para ids, "" para textos.
 * @returns {string}
 */
function sinRepetir(valor, usados, separador) {
  let candidato = valor;
  for (let n = 2; usados.has(candidato); n++) candidato = `${valor}${separador}${n}`;
  usados.add(candidato);
  return candidato;
}


/** Comprueba si Twemoji tiene imagen para el emoji (misma regla que importar-twemoji.js). */
function tieneImagen(emoji) {
  const limpio = emoji.includes("\u200D") ? emoji : emoji.replace(/\uFE0F/g, "");
  const archivo = Array.from(limpio, (c) => c.codePointAt(0).toString(16)).join("-") + ".svg";
  return existsSync(join(TWEMOJI, archivo));
}


function principal() {
  if (!existsSync(EMOJIBASE) || !existsSync(TWEMOJI)) {
    console.error("Faltan paquetes. Ejecuta primero:  npm install");
    process.exit(1);
  }

  const actuales = JSON.parse(readFileSync(DICCIONARIO, "utf8"));
  const oficiales = JSON.parse(readFileSync(EMOJIBASE, "utf8"));

  // Entradas actuales indexadas por emoji, para saber cuáles ya existen.
  const existentes = new Map(actuales.map((e) => [claveEmoji(e.emoji), e]));
  const idsUsados = new Set(actuales.map((e) => e.id));
  // Solo los emojis base tienen texto propio (las variantes lo heredan).
  const textosUsados = new Set(actuales.filter((e) => e.base === undefined).map((e) => e.texto));

  // Lista final: pares [orden Unicode, entrada], para ordenar al terminar.
  const resultado = [];
  const vistos = new Set();
  let nuevas = 0;
  let sinTwemoji = 0;
  let renombradas = 0;
  let limpiadas = 0;

  /**
   * Procesa un emoji oficial: conserva la entrada existente o crea una nueva.
   * "base" y "tono" solo se usan para las variantes de tono de piel.
   */
  const agregar = (oficialOriginal, categoria, base) => {
    // Las teclas "#" y "*" se nombran con palabras, porque normalizar()
    // borra los símbolos: "teclas: #" y "teclas: *" quedarían ambos "teclas".
    const oficial = {
      ...oficialOriginal,
      label: oficialOriginal.label.replace("#", "numeral").replace("*", "asterisco"),
    };
    const emoji = emojiDesdeCodigo(oficial.hexcode);
    const clave = claveEmoji(emoji);
    if (vistos.has(clave)) return null;
    vistos.add(clave);

    const existente = existentes.get(clave);
    if (existente) {
      // Variantes de versiones anteriores del diccionario que todavía tienen
      // texto y categoría propios: se les quitan, para que hereden los de su
      // base (si no, el núcleo las rechazaría).
      if (existente.base !== undefined && (existente.texto !== undefined || existente.categoria !== undefined)) {
        const { texto, categoria, ...limpia } = existente;
        resultado.push([oficial.order, limpia]);
        limpiadas += 1;
        return limpia;
      }
      resultado.push([oficial.order, existente]);
      return existente;
    }
    if (!tieneImagen(emoji)) {
      sinTwemoji += 1;
      return null;
    }

    const id = sinRepetir(idDesdeNombre(oficial.label), idsUsados, "-");

    // Variante de tono: solo id, emoji, base y tono. El texto y la categoría
    // los pone el núcleo copiándolos de la base.
    if (base) {
      const entrada = { id, emoji, base: base.id, tono: oficial.tone };
      resultado.push([oficial.order, entrada]);
      nuevas += 1;
      return entrada;
    }

    // Emoji base: su texto es el nombre oficial normalizado.
    const textoOficial = normalizar(oficial.label);
    const texto = sinRepetir(textoOficial, textosUsados, "");
    if (texto !== textoOficial) renombradas += 1;

    const entrada = { id, emoji, texto, categoria };
    resultado.push([oficial.order, entrada]);
    nuevas += 1;
    return entrada;
  };

  for (const oficial of oficiales) {
    const categoria = CATEGORIA_POR_GRUPO[oficial.group];
    if (!categoria) continue; // componentes y letras regionales sueltas

    const base = agregar(oficial, categoria, null);
    if (!base) continue;
    for (const variante of oficial.skins ?? []) {
      agregar(variante, categoria, base);
    }
  }

  // Las entradas propias que no son emojis oficiales (si las hubiera) se
  // conservan al final.
  for (const entrada of actuales) {
    if (!vistos.has(claveEmoji(entrada.emoji))) resultado.push([Infinity, entrada]);
  }

  resultado.sort((a, b) => a[0] - b[0]);

  // Una entrada por línea, para que sea fácil de leer y editar a mano:
  //   { "id": "luna", "emoji": "🌙", "texto": "luna", "categoria": "viajes" }
  const lineas = resultado.map(([, e]) => {
    const campos = Object.entries(e).map(([clave, valor]) => `"${clave}": ${JSON.stringify(valor)}`);
    return `  { ${campos.join(", ")} }`;
  });
  writeFileSync(DICCIONARIO, "[\n" + lineas.join(",\n") + "\n]\n");

  console.log(`Entradas: ${resultado.length} (${nuevas} nuevas, ${actuales.length} ya existían)`);
  if (renombradas > 0) console.log(`Textos con número añadido para no repetirse: ${renombradas}`);
  if (limpiadas > 0) console.log(`Variantes de tono que ahora heredan el texto de su base: ${limpiadas}`);
  if (sinTwemoji > 0) console.log(`Omitidos porque Twemoji aún no tiene su imagen: ${sinTwemoji}`);
  console.log('\nAhora ejecuta "npm run imagenes" para copiar las imágenes.');
}

principal();
