// =============================================================================
// nucleo.test.js — Pruebas automáticas del núcleo
// -----------------------------------------------------------------------------
// Comprueban que la lógica funciona sin abrir el navegador.
// Para ejecutarlas hace falta Node.js. Desde la carpeta del proyecto:
//
//     node --test
//
// Cada test() describe un comportamiento esperado. Si alguno falla, Node dice
// cuál, qué resultado esperaba y qué obtuvo.
// =============================================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { normalizar, separarGrafemas } from "../src/nucleo/normalizar.js";
import { crearDiccionario } from "../src/nucleo/diccionario.js";
import { textoAEmojis, emojisATexto } from "../src/nucleo/traductor.js";

// Se usa el diccionario real del proyecto, así las pruebas también avisan si
// alguien añade una entrada mal escrita en datos/diccionario.json.
const entradas = JSON.parse(
  readFileSync(new URL("../datos/diccionario.json", import.meta.url), "utf8")
);
const dic = crearDiccionario(entradas);


// --- normalizar --------------------------------------------------------------

test("normalizar quita mayúsculas, tildes, diéresis, signos y espacios", () => {
  assert.equal(normalizar("¡Hijo de Perra!"), "hijodeperra");
  assert.equal(normalizar("Pingüino Árbol"), "pinguinoarbol");
});

test("normalizar conserva la ñ (también la Ñ mayúscula)", () => {
  assert.equal(normalizar("Ñandú y niño"), "ñanduyniño");
});

test("normalizar puede conservar espacios", () => {
  assert.equal(normalizar("  Hola,   Mundo  ", { conservarEspacios: true }), " hola mundo ");
});

test("normalizar conserva los saltos de línea al conservar espacios", () => {
  assert.equal(normalizar("Hola \n\n mundo", { conservarEspacios: true }), "hola\nmundo");
});

test("separarGrafemas no rompe las banderas", () => {
  assert.deepEqual(separarGrafemas("🇪🇸🇵🇪a"), ["🇪🇸", "🇵🇪", "a"]);
});


// --- diccionario -------------------------------------------------------------

test("el diccionario rechaza emojis repetidos", () => {
  assert.throws(
    () => crearDiccionario([
      { id: "a", emoji: "🐩", texto: "perra", categoria: "animales" },
      { id: "b", emoji: "🐩", texto: "caniche", categoria: "animales" },
    ]),
    /repetido/
  );
});

test("el diccionario rechaza textos sin normalizar", () => {
  assert.throws(
    () => crearDiccionario([{ id: "a", emoji: "❤️", texto: "Corazón", categoria: "caras" }]),
    /normalizado/
  );
});

test("el diccionario rechaza categorías que no existen", () => {
  assert.throws(
    () => crearDiccionario([{ id: "a", emoji: "🐩", texto: "perra", categoria: "perros" }]),
    /no existe/
  );
});
// Diccionario de prueba con un emoji base y dos variantes de tono.
const conTonos = () => crearDiccionario([
  { id: "biceps", emoji: "💪", texto: "brazo", categoria: "gente" },
  { id: "biceps-claro", emoji: "💪🏻", base: "biceps", tono: 1 },
  { id: "biceps-oscuro", emoji: "💪🏿", base: "biceps", tono: 5 },
]);

test("las variantes de tono heredan el texto y la categoría de su base", () => {
  const d = conTonos();
  const oscuro = d.entradas.find((e) => e.id === "biceps-oscuro");
  assert.equal(oscuro.texto, "brazo");
  assert.equal(oscuro.categoria, "gente");
});

test("todas las variantes de tono se traducen con el texto de su base", () => {
  assert.equal(emojisATexto("💪 💪🏻 💪🏿", conTonos()), "Brazo brazo brazo");
});

test("al traducir a emojis, el texto da siempre el emoji base", () => {
  assert.equal(textoAEmojis("brazo", conTonos()), "💪");
});

test("el diccionario rechaza variantes con texto propio", () => {
  assert.throws(
    () => crearDiccionario([
      { id: "biceps", emoji: "💪", texto: "brazo", categoria: "gente" },
      { id: "biceps-oscuro", emoji: "💪🏿", texto: "fuerza", base: "biceps", tono: 5 },
    ]),
    /no lleva texto ni categoría/
  );
});

test("el diccionario rechaza tonos inválidos o bases que no existen", () => {
  assert.throws(
    () => crearDiccionario([{ id: "a", emoji: "👍🏿", base: "nada", tono: 9 }]),
    (error) => /tono debe ser/.test(error.message) && /no existe/.test(error.message)
  );
});

test("el diccionario rechaza entradas incompletas", () => {
  assert.throws(() => crearDiccionario([{ id: "a", emoji: "🐩" }]), /falta texto/);
});


// --- texto → emojis ----------------------------------------------------------

test("traduce palabras completas y respeta los espacios originales", () => {
  assert.equal(textoAEmojis("Hijo de perra", dic), "👶 de 🐩");
});

test("traduce sílabas sin inventar espacios dentro de la palabra", () => {
  assert.equal(textoAEmojis("Especial", dic), "🇪🇸🇵🇪cial");
});

test("un reemplazo puede cruzar palabras; el espacio tragado va tras el emoji", () => {
  // Diccionario de prueba con el ejemplo de la regla de los espacios.
  const d = crearDiccionario([
    { id: "ala", emoji: "🪽", texto: "ala", categoria: "animales" },
    { id: "mosca", emoji: "🪰", texto: "mosca", categoria: "animales" },
    { id: "brazo", emoji: "💪", texto: "brazo", categoria: "gente" },
  ]);
  // "alamos cabrazo" → "ala|mos ca|brazo": el espacio queda dentro de "mosca".
  assert.equal(textoAEmojis("alamos cabrazo", d), "🪽🪰 💪");
  // Un espacio tragado al final del texto no deja un espacio colgando.
  assert.equal(textoAEmojis("mos ca", d), "🪰");
});

test("conserva los saltos de línea", () => {
  assert.equal(textoAEmojis("perro\ngato", dic), "🐕\n🐈");
});

test("prefiere la coincidencia más larga", () => {
  // "perro" existe completo; no debe salir 🇵🇪 + "rro".
  assert.equal(textoAEmojis("perro", dic), "🐕");
  // "corazon" gana a "co".
  assert.equal(textoAEmojis("Corazón", dic), "❤️");
});

test("pone mayúscula a la primera letra si el resultado empieza por letra", () => {
  assert.equal(textoAEmojis("un gato", dic), "Un 🐈");
});

test("un texto vacío da un resultado vacío", () => {
  assert.equal(textoAEmojis("", dic), "");
  assert.equal(emojisATexto("", dic), "");
});


// --- emojis → texto ----------------------------------------------------------

test("traduce emojis a texto", () => {
  assert.equal(emojisATexto("👶 de 🐩", dic), "Hijo de perra");
});

test("reconoce un emoji aunque venga sin el selector de variación", () => {
  // "☀" (sin U+FE0F) debe encontrar la entrada "☀️".
  assert.equal(emojisATexto("☀", dic), "Sol");
});

test("conserva los emojis que no están en el diccionario", () => {
  // Como el diccionario real ya tiene casi todos los emojis, se usa uno
  // pequeño de prueba en el que 🦄 no existe.
  const pequeno = crearDiccionario([{ id: "caniche", emoji: "🐩", texto: "perra", categoria: "animales" }]);
  assert.equal(emojisATexto("🐩 🦄", pequeno), "Perra 🦄");
});

test("ida y vuelta conserva los espacios cuando ningún emoji cruza palabras", () => {
  assert.equal(emojisATexto(textoAEmojis("Perro gato", dic), dic), "Perro gato");
  assert.equal(emojisATexto(textoAEmojis("Hijo de perra", dic), dic), "Hijo de perra");
});
