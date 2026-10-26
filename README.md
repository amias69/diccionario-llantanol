# Llantañol

El llantañol es una forma de escribir en la que algunas sílabas y palabras se cambian por emojis. Esta aplicación traduce del español al llantañol y del llantañol al español, mientras escribes.

| Español | Llantañol |
| --- | --- |
| Hijo de perra | 👶 de 🐩 |
| Especial | 🇪🇸🇵🇪cial |
| Mi hermano tiene un oso | Mi her🇲🇦no tiene un 🐻 |
| Corazón | ❤️ |
| Un gato | Un 🐈 |

## Cómo abrir la aplicación

Por ahora la aplicación se abre en el navegador desde tu computadora:

1. Abre la carpeta `diccionario_llantanol` en Visual Studio Code.
2. Haz clic derecho sobre `index.html` y elige **Open with Live Server**.
3. Se abrirá el navegador con la aplicación lista para usar.

> Abrir `index.html` con doble clic no funciona: el navegador bloquea la carga del diccionario. Siempre hay que abrirla con Live Server.

## Cómo usarla

1. **Escribe** en el cuadro de la izquierda (en el celular, el de arriba). La traducción aparece al instante en el otro cuadro.
2. **Cambia la dirección** con el botón ⇄. La traducción actual pasa al cuadro de entrada para que puedas traducirla de vuelta.
3. **Copia** el resultado con el botón **Copiar** y pégalo donde quieras: WhatsApp, Discord, un correo…
4. **Borra** el texto con el botón **Borrar** para empezar de nuevo.

### Escribir en llantañol con el selector de emojis

Cuando la dirección es **Llantañol → Español**, debajo del cuadro de entrada aparece un panel con todos los emojis del llantañol, ordenados en pestañas: caritas, gente, animales, banderas…

- Toca una pestaña para ver sus emojis.
- Toca un emoji para añadirlo donde está el cursor.
- Deja el ratón quieto sobre un emoji para ver qué significa, por ejemplo "🐩 = perra".
- En las pestañas con personas o manos aparece una fila de manos ✋ de distintos colores: elige un **tono de piel** y todos los emojis cambian a ese tono.
- Usa el botón **😀 Emojis** para ocultar o volver a mostrar el panel.

En la computadora las categorías aparecen en una columna a la izquierda. En el celular aparecen como una fila de iconos que puedes deslizar de lado.

## Qué hace la aplicación con tu texto

Para que la traducción sea siempre igual, la aplicación "limpia" lo que escribes antes de traducir:

- **No distingue mayúsculas.** "PERRA", "Perra" y "perra" dan lo mismo.
- **Quita tildes y diéresis.** "Corazón" se lee como "corazon" y "pingüino" como "pinguino".
- **Respeta la ñ.** "Niño" sigue teniendo ñ.
- **Quita los signos.** Comas, puntos y signos de exclamación desaparecen.
- **Une las palabras para traducir.** La frase se traduce como si fuera una sola tira de letras, así que un emoji puede formarse con el final de una palabra y el principio de la siguiente.
- **Busca primero lo más largo.** Si una palabra entera tiene emoji, se usa ese antes que los de sus sílabas. "Perro" se vuelve 🐕 y no 🇵🇪 + "rro".
- **Devuelve los espacios a su sitio.** Después de traducir, cada espacio vuelve a donde lo escribiste. Si un emoji se formó cruzando un espacio, ese espacio se coloca justo después del emoji. Los saltos de línea también se conservan.

Por ejemplo, en "alamos cabrazo" las letras unidas forman "ala", "mosca" y "brazo". El espacio estaba dentro de "mos ca", así que queda después de la mosca: "🪽🪰 💪".

El resultado siempre sale en minúsculas, salvo la primera letra.

## Al traducir de vuelta a español

- Cada emoji se cambia por su texto: 🐩 se vuelve "perra".
- Los emojis que no forman parte del llantañol se dejan tal cual, para que veas que no se tradujeron.
- Los espacios se respetan tal como están: "👶 de 🐩" vuelve como "Hijo de perra", pero "❤️🐩" (sin espacio) vuelve como "Corazonperra".
- Cuando un emoji se formó cruzando dos palabras, la vuelta no puede saber dónde iba el espacio: "🪽🪰 💪" vuelve como "Alamosca brazo".

## Añadir o cambiar palabras

El diccionario incluye todos los emojis de Twemoji, con sus variantes de tono de piel: unas 3.650 entradas. Cada emoji significa su **nombre oficial en español**, sin espacios ni tildes: 🌙 es "luna" y 🤌 es "dedosjuntosapuntandohaciaarriba". Algunos tienen un significado propio, elegido a mano: 😂 es "jaja" y 🐩 es "perra".

Para cambiar lo que significa un emoji, busca su línea en `datos/diccionario.json` (con Ctrl+F y el emoji) y cambia su **texto**.

Todas las palabras y sílabas del llantañol están en el archivo `datos/diccionario.json`. Cada línea es una entrada con cuatro datos:

```json
{ "id": "caniche", "emoji": "🐩", "texto": "perra", "categoria": "animales" }
```

- **id**: un nombre único para el emoji, en minúsculas, sin espacios (usa guiones). Es también el nombre de su imagen.
- **emoji**: el emoji.
- **texto**: lo que significa, escrito en minúsculas, sin tildes ni espacios.
- **categoria**: la pestaña del selector donde aparece. Debe ser una de estas:

| categoria | Pestaña |
| --- | --- |
| `caras` | Caritas y emociones |
| `gente` | Gente y cuerpo |
| `animales` | Animales y naturaleza |
| `comida` | Comida y bebida |
| `viajes` | Viajes y lugares |
| `actividades` | Actividades |
| `objetos` | Objetos |
| `simbolos` | Símbolos |
| `banderas` | Banderas |

### Las variantes de tono de piel

Las variantes de color de un emoji (💪🏻 💪🏼 💪🏽 💪🏾 💪🏿) **significan lo mismo que el emoji original** (💪). Por eso no tienen texto ni categoría propios, sino dos datos que las unen a él:

- **base**: el id del emoji original.
- **tono**: del 1 (claro) al 5 (oscuro).

```json
{ "id": "biceps", "emoji": "💪", "texto": "brazo", "categoria": "gente" },
{ "id": "biceps-flexionado-tono-de-piel-medio", "emoji": "💪🏽", "base": "biceps", "tono": 3 }
```

Para cambiar el significado de un emoji con tonos, cambia solo el texto del original: todas sus variantes cambian con él. Al traducir a llantañol, "brazo" da siempre el emoji original, 💪.

Reglas que hay que cumplir:

- Un emoji solo puede tener un significado, y un texto solo puede tener un emoji.
- No se puede repetir un id.
- Entre una entrada y otra va una coma, pero no después de la última.

Si algo está mal, la aplicación no arranca y te muestra en pantalla qué entrada hay que corregir.

## Cuando salgan emojis nuevos

Cada año Unicode publica emojis nuevos. Para añadirlos todos de una vez, con su nombre oficial:

```
npm update
npm run completar
npm run imagenes
```

`npm run completar` solo añade los emojis que faltan: nunca cambia los significados que ya tienes.

`npm run completar` añade los emojis nuevos al diccionario y `npm run imagenes` copia sus imágenes de Twemoji a `imagenes/emojis/`. Al recargar la página, los emojis nuevos ya traducen, aparecen en su pestaña del selector y se ven igual en todos los sistemas.

Si quieres añadir uno a mano, escribe su línea en `datos/diccionario.json` (antes del `]` final y con una coma al final de la línea anterior) y ejecuta `npm run imagenes`.

La primera vez necesitas tener instalado [Node.js](https://nodejs.org/es) y ejecutar `npm install` una sola vez, para descargar los paquetes con los datos y las imágenes de todos los emojis.

## Imágenes de los emojis

Algunos sistemas, como Windows, no muestran los emojis de banderas: en lugar de 🇵🇪 se ven las letras "PE". Por eso la aplicación dibuja cada emoji del diccionario con su imagen de [Twemoji](https://github.com/jdecked/twemoji), guardada en `imagenes/emojis/` con el nombre de su **id** (la imagen de `bandera-pe` es `bandera-pe.svg`).

Si un emoji no tiene imagen, la aplicación lo muestra como lo dibuje tu sistema.

Las imágenes de Twemoji son © Twitter, Inc. y colaboradores, y tienen licencia [CC-BY 4.0](https://creativecommons.org/licenses/by/4.0/deed.es).

## Preguntas frecuentes

**La aplicación dice que hay errores en el diccionario.**
Lee el mensaje: indica el número de entrada y qué le pasa. Corrígela en `datos/diccionario.json` y recarga la página.

**Una palabra se partió en un emoji raro (hermoso → herm🐻).**
Es parte del llantañol: si un trozo de la palabra coincide con el significado de un emoji ("oso" es 🐻), se reemplaza. Si no te gusta, cambia el texto de ese emoji por otro más largo.

**Escribí una palabra y no cambió a emoji.**
Esa palabra o sus sílabas no están en el diccionario. Puedes añadirlas (ver *Añadir o cambiar palabras*).

**El botón Copiar no funciona.**
El navegador solo permite copiar en páginas seguras. Ábrela con Live Server, no con doble clic.
