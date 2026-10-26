// =============================================================================
// selector-emojis.js — Panel para elegir emojis por categorías
// -----------------------------------------------------------------------------
// Inspirado en el selector de GNOME (Caracteres) y en el de WhatsApp:
//   - Pantalla ancha: lista de categorías a la izquierda y cuadrícula de
//     emojis a la derecha, como GNOME.
//   - Celular: fila de pestañas con iconos arriba y la cuadrícula debajo,
//     como WhatsApp.
// El cambio entre una forma y otra lo hace solo el CSS (estilos.css).
//
// Solo muestra los emojis del diccionario, porque son los únicos que la app
// sabe traducir.
//
// Tonos de piel: la cuadrícula muestra cada emoji una sola vez (sin tono) y
// una barra de tonos encima cambia todos los emojis de personas a la vez,
// como en WhatsApp. Los emojis de dos personas con tonos distintos
// (🧑🏻‍🤝‍🧑🏾) no aparecen en el selector, pero sí se traducen si se pegan.
//
// Este módulo no sabe nada del campo de texto: cuando el usuario elige un
// emoji, simplemente avisa a quien lo creó (app.js) mediante una función
// "alElegir". Así el selector se podría reutilizar en otro sitio sin cambios.
// =============================================================================

import { CATEGORIAS, claveEmoji } from "../nucleo/diccionario.js";
import { crearEmoji } from "./dibujar-emojis.js";

// Nombre visible e icono de cada pestaña. Los identificadores coinciden con
// CATEGORIAS del núcleo; aquí solo se decide cómo se presentan.
const PRESENTACION = {
  caras: { nombre: "Caritas y emociones", icono: "😀" },
  gente: { nombre: "Gente y cuerpo", icono: "👋" },
  animales: { nombre: "Animales y naturaleza", icono: "🐻" },
  comida: { nombre: "Comida y bebida", icono: "🍔" },
  viajes: { nombre: "Viajes y lugares", icono: "🚗" },
  actividades: { nombre: "Actividades", icono: "⚽" },
  objetos: { nombre: "Objetos", icono: "💡" },
  simbolos: { nombre: "Símbolos", icono: "🔣" },
  banderas: { nombre: "Banderas", icono: "🏳️" },
};

// Botones de la barra de tonos: 0 = sin tono (amarillo), 1 = claro ... 5 = oscuro.
const TONOS = [
  { tono: 0, muestra: "✋", nombre: "Sin tono" },
  { tono: 1, muestra: "✋🏻", nombre: "Tono claro" },
  { tono: 2, muestra: "✋🏼", nombre: "Tono claro medio" },
  { tono: 3, muestra: "✋🏽", nombre: "Tono medio" },
  { tono: 4, muestra: "✋🏾", nombre: "Tono oscuro medio" },
  { tono: 5, muestra: "✋🏿", nombre: "Tono oscuro" },
];


/**
 * Construye el selector de emojis dentro de un contenedor.
 *
 * Funcionamiento general:
 *   1. Agrupa las entradas del diccionario por categoría.
 *   2. Crea una pestaña por cada categoría que tenga al menos un emoji
 *      (si no hay ninguna comida, no aparece la pestaña "Comida").
 *   3. Al pulsar una pestaña, dibuja sus emojis en la cuadrícula.
 *   4. Al pulsar un emoji, llama a alElegir(entrada).
 *
 * @param {HTMLElement} contenedor - Elemento vacío donde se monta el selector.
 * @param {object} diccionario - El diccionario creado por crearDiccionario().
 * @param {{alElegir: (entrada: object) => void}} opciones
 */
export function crearSelector(contenedor, diccionario, { alElegir }) {
  // 1a. Separar las variantes de tono de los emojis base. Las variantes se
  //     guardan en un mapa para encontrarlas rápido:
  //       variantes.get("pulgar-hacia-arriba").get(3) → entrada de 👍🏽
  //     Solo se guardan las de un único tono (tono numérico).
  const variantes = new Map();
  for (const entrada of diccionario.entradas) {
    if (entrada.base && typeof entrada.tono === "number") {
      if (!variantes.has(entrada.base)) variantes.set(entrada.base, new Map());
      variantes.get(entrada.base).set(entrada.tono, entrada);
    }
  }
  const esBase = (entrada) => entrada.base === undefined;

  // 1b. Agrupar los emojis base: { caras: [entrada, entrada...], gente: [...] }
  //     Se recorre CATEGORIAS (y no las entradas) para respetar su orden.
  const grupos = CATEGORIAS
    .map((id) => ({
      id,
      ...PRESENTACION[id],
      entradas: diccionario.entradas.filter((e) => e.categoria === id && esBase(e)),
    }))
    .filter((grupo) => grupo.entradas.length > 0);

  // Tono elegido en la barra (0 = sin tono) y grupo que se está mostrando.
  let tonoActual = 0;
  let grupoActual = null;

  // Devuelve la entrada que hay que mostrar para un emoji base según el tono
  // elegido: su variante si existe, o el propio emoji si no tiene tonos
  // (como 😂 o 🐩).
  const conTono = (entrada) => variantes.get(entrada.id)?.get(tonoActual) ?? entrada;

  // 2. Estructura del selector:
  //    <div class="selector-pestanas" role="tablist"> ...pestañas... </div>
  //    <div class="selector-contenido">
  //      <h2 class="selector-titulo">Caritas y emociones</h2>
  //      <div class="selector-cuadricula" role="tabpanel"> ...emojis... </div>
  //    </div>
  const pestanas = document.createElement("div");
  pestanas.className = "selector-pestanas";
  pestanas.setAttribute("role", "tablist");
  pestanas.setAttribute("aria-label", "Categorías de emojis");

  const contenido = document.createElement("div");
  contenido.className = "selector-contenido";

  // Cabecera: título del grupo a la izquierda, barra de tonos a la derecha.
  const cabecera = document.createElement("div");
  cabecera.className = "selector-cabecera";

  const titulo = document.createElement("h2");
  titulo.className = "selector-titulo";

  const barraTonos = crearBarraTonos(diccionario, (tono) => {
    tonoActual = tono;
    mostrarGrupo(grupoActual, { conservarPosicion: true });
  });

  cabecera.append(titulo, barraTonos);

  const cuadricula = document.createElement("div");
  cuadricula.className = "selector-cuadricula";
  cuadricula.setAttribute("role", "tabpanel");

  contenido.append(cabecera, cuadricula);
  contenedor.replaceChildren(pestanas, contenido);

  // Muestra los emojis de un grupo y marca su pestaña como activa.
  // conservarPosicion: al cambiar de tono no se vuelve arriba de la lista.
  const mostrarGrupo = (grupo, { conservarPosicion = false } = {}) => {
    grupoActual = grupo;
    for (const boton of pestanas.children) {
      // aria-selected indica a los lectores de pantalla cuál está activa;
      // el CSS también lo usa para resaltarla.
      boton.setAttribute("aria-selected", String(boton.dataset.categoria === grupo.id));
    }
    titulo.textContent = grupo.nombre;

    // La barra de tonos solo aparece si en este grupo hay emojis con tonos
    // (en "Animales" o "Banderas" no tendría efecto).
    barraTonos.hidden = !grupo.entradas.some((e) => variantes.has(e.id));

    const posicion = cuadricula.scrollTop;
    cuadricula.replaceChildren(...grupo.entradas.map((e) => crearBotonEmoji(conTono(e), alElegir)));
    cuadricula.scrollTop = conservarPosicion ? posicion : 0;
  };

  // 3. Una pestaña por grupo.
  for (const grupo of grupos) {
    const boton = document.createElement("button");
    boton.type = "button";
    boton.className = "selector-pestana";
    boton.setAttribute("role", "tab");
    boton.dataset.categoria = grupo.id;
    boton.title = grupo.nombre;

    const icono = document.createElement("span");
    icono.className = "selector-pestana-icono";
    icono.setAttribute("aria-hidden", "true"); // el nombre ya lo describe
    icono.textContent = grupo.icono;

    const nombre = document.createElement("span");
    nombre.className = "selector-pestana-nombre";
    nombre.textContent = grupo.nombre;

    boton.append(icono, nombre);
    boton.addEventListener("click", () => mostrarGrupo(grupo));
    pestanas.append(boton);
  }

  if (grupos.length > 0) mostrarGrupo(grupos[0]);
}


/**
 * Crea la barra de tonos de piel (función interna).
 *
 * Son seis botones; el elegido se marca con aria-pressed="true" (así lo
 * anuncian los lectores de pantalla y el CSS lo resalta). Cada muestra se
 * dibuja con su imagen de Twemoji si ✋ y sus variantes están en el
 * diccionario.
 *
 * @param {object} diccionario
 * @param {(tono: number) => void} alCambiar - Se llama con el tono elegido.
 * @returns {HTMLDivElement}
 */
function crearBarraTonos(diccionario, alCambiar) {
  const barra = document.createElement("div");
  barra.className = "selector-tonos";
  barra.setAttribute("role", "group");
  barra.setAttribute("aria-label", "Tono de piel");

  for (const { tono, muestra, nombre } of TONOS) {
    const boton = document.createElement("button");
    boton.type = "button";
    boton.className = "selector-tono";
    boton.title = nombre;
    boton.setAttribute("aria-label", nombre);
    boton.setAttribute("aria-pressed", String(tono === 0));

    const entrada = diccionario.porEmoji.get(claveEmoji(muestra));
    boton.append(entrada ? crearEmoji(entrada) : document.createTextNode(muestra));

    boton.addEventListener("click", () => {
      for (const otro of barra.children) otro.setAttribute("aria-pressed", String(otro === boton));
      alCambiar(tono);
    });
    barra.append(boton);
  }
  return barra;
}


/**
 * Crea el botón de un emoji de la cuadrícula (función interna).
 *
 * Al pasar el ratón por encima (title) se ve qué significa en llantañol,
 * por ejemplo "🐩 = perra". Es una forma rápida de aprender el diccionario.
 *
 * @param {{emoji: string, texto: string}} entrada
 * @param {(entrada: object) => void} alElegir
 * @returns {HTMLButtonElement}
 */
function crearBotonEmoji(entrada, alElegir) {
  const boton = document.createElement("button");
  boton.type = "button";
  boton.className = "selector-emoji";
  boton.title = `${entrada.emoji} = ${entrada.texto}`;
  boton.setAttribute("aria-label", `${entrada.emoji}, significa ${entrada.texto}`);
  boton.append(crearEmoji(entrada));
  boton.addEventListener("click", () => alElegir(entrada));
  return boton;
}
