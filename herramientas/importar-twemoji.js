// =============================================================================
// importar-twemoji.js — Copia las imágenes de Twemoji que usa el diccionario
// -----------------------------------------------------------------------------
// Herramienta de desarrollo: no forma parte de la app, se ejecuta a mano en
// la terminal cada vez que se añaden emojis al diccionario:
//
//     npm run imagenes
//
// Qué hace:
//   1. Lee datos/diccionario.json.
//   2. Para cada entrada, busca su imagen dentro del paquete @twemoji/svg
//      (instalado con "npm install" en node_modules/).
//   3. La copia a imagenes/emojis/ con el nombre de su id:
//        🇵🇪 → node_modules/@twemoji/svg/1f1f5-1f1ea.svg
//            → imagenes/emojis/bandera-pe.svg
//   4. Borra las imágenes de emojis que ya no están en el diccionario.
//   5. Muestra un resumen y avisa de los emojis que Twemoji no tiene.
// =============================================================================

import { readFileSync, readdirSync, copyFileSync, existsSync, mkdirSync, unlinkSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

// Rutas calculadas desde la ubicación de este archivo, para que el script
// funcione aunque se ejecute desde otra carpeta.
const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const DICCIONARIO = join(RAIZ, "datos", "diccionario.json");
const ORIGEN = join(RAIZ, "node_modules", "@twemoji", "svg");
const DESTINO = join(RAIZ, "imagenes", "emojis");


/**
 * Calcula el nombre de archivo que usa Twemoji para un emoji.
 *
 * Twemoji nombra cada imagen con los "códigos Unicode" del emoji en
 * hexadecimal, unidos por guiones. Por ejemplo:
 *   🐩  → un código:  1f429        → "1f429.svg"
 *   🇵🇪 → dos códigos: 1f1f5 1f1ea → "1f1f5-1f1ea.svg" (las letras P y E)
 *
 * Regla especial copiada de Twemoji: el carácter invisible U+FE0F
 * (selector de variación, ver claveEmoji en diccionario.js) se quita del
 * nombre, salvo en emojis compuestos que llevan U+200D (el "pegamento" que
 * une varios emojis en uno, como 👨‍👩‍👧).
 *
 * @param {string} emoji
 * @returns {string} Nombre del archivo, por ejemplo "1f429.svg".
 */
function nombreTwemoji(emoji) {
  const conPegamento = emoji.includes("\u200D");
  const limpio = conPegamento ? emoji : emoji.replace(/\uFE0F/g, "");
  // Array.from recorre el texto por códigos Unicode completos (no por piezas
  // internas) y codePointAt(0) da el número de cada uno.
  const codigos = Array.from(limpio, (c) => c.codePointAt(0).toString(16));
  return codigos.join("-") + ".svg";
}


function principal() {
  if (!existsSync(ORIGEN)) {
    console.error("No se encontró Twemoji. Ejecuta primero:  npm install");
    process.exit(1);
  }
  mkdirSync(DESTINO, { recursive: true });

  const entradas = JSON.parse(readFileSync(DICCIONARIO, "utf8"));
  const faltan = [];
  let copiadas = 0;

  for (const { id, emoji } of entradas) {
    const archivo = nombreTwemoji(emoji);
    const origen = join(ORIGEN, archivo);
    if (existsSync(origen)) {
      copyFileSync(origen, join(DESTINO, `${id}.svg`));
      copiadas += 1;
    } else {
      faltan.push(`${emoji}  (id: ${id}, se buscó ${archivo})`);
    }
  }

  // Limpieza: si se borró o renombró una entrada, su imagen vieja sobra.
  const idsActuales = new Set(entradas.map((e) => `${e.id}.svg`));
  let borradas = 0;
  for (const archivo of readdirSync(DESTINO)) {
    if (archivo.endsWith(".svg") && !idsActuales.has(archivo)) {
      unlinkSync(join(DESTINO, archivo));
      borradas += 1;
    }
  }

  console.log(`Imágenes copiadas: ${copiadas} de ${entradas.length}`);
  if (borradas > 0) console.log(`Imágenes antiguas borradas: ${borradas}`);
  if (faltan.length > 0) {
    console.log("\nTwemoji no tiene estos emojis (se verán con la fuente del sistema):");
    for (const linea of faltan) console.log("  " + linea);
  }
}

principal();
