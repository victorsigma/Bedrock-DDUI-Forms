# bedrock-ddui-forms

> [🇬🇧 English](./README.md) · 🇪🇸 Español

Una capa declarativa para crear formularios **DDUI** (`CustomForm`) de `@minecraft/server-ui` a partir de objetos.

En lugar de encadenar llamadas sobre `CustomForm`, describes la vista como datos y un renderizador la traduce:

```js
{
    title: "Ajustes",
    content: [
        { type: "header", text: "General" },
        { type: "toggle", label: "Activar función", toggled: new ObservableBoolean(true, { clientWritable: true }) },
        { type: "close-button" }
    ]
}
```

> No afiliado a Mojang ni a Microsoft. "Minecraft" y "Bedrock" se usan solo para describir la plataforma a la que apunta esta librería.

## Características

- **Vistas declarativas**: un formulario es un objeto con `title` y un arreglo `content`.
- **Tipado con la API oficial**: los modelos son typedefs de JSDoc que reutilizan los tipos de `@minecraft/server-ui` (`ButtonOptions`, `SliderOptions`, …), así que se mantienen sincronizados con el módulo.
- **Navegación sencilla**: un botón puede abrir otra vista con `to`, combinable con `onClick`.
- **Router**: registra vistas por nombre, pásales parámetros y vuelve atrás con `"back"`.
- **Fácil de extender**: añadir un tipo de elemento nuevo es una entrada en una tabla y una función.
- **Fallback seguro**: un `type` no soportado muestra un label visible y registra una advertencia, en vez de romper todo el formulario.

## Requisitos

- `@minecraft/server-ui` **2.2.0** (estable)

## Instalación

El motor de scripts de Minecraft **no** resuelve paquetes de npm (dentro del juego no existe `node_modules`). Solo los módulos `@minecraft/*` declarados en el `manifest.json` los aporta el juego, así que la librería tiene que terminar como archivos dentro de la carpeta `scripts/` de tu addon. Hay dos formas de hacerlo.

### Opción 1: copiar los archivos

Copia la librería dentro de tu behavior pack e impórtala con rutas relativas:

```
BP/
  manifest.json
  scripts/
    main.js
    libs/bedrock-ddui-forms/
      index.js
      core/
      models/
    views/
```

```js
import { customFormRender } from "../libs/bedrock-ddui-forms/index";
```

No necesita herramientas, pero para actualizar tienes que copiar los archivos de nuevo.

### Opción 2: usar un bundler (recomendada si instalas desde npm)

```bash
npm install bedrock-ddui-forms
```

Después empaqueta tu código y la librería en un solo archivo dentro de `scripts/`. Por ejemplo, con [esbuild](https://esbuild.github.io/):

```bash
npx esbuild src/index.js --bundle --format=esm --outfile=scripts/libs/bedrock-ddui-forms/index.js --external:@minecraft/server --external:@minecraft/server-ui
```

Los `--external` son importantes: los módulos `@minecraft/*` los aporta el juego y no deben incluirse en el bundle. Con este flujo, `npm update` basta para actualizar la librería.

### Siempre necesario

- Declara `@minecraft/server-ui` en tu `manifest.json` (esta librería apunta a la versión `2.2.0`). Nunca se copia ni se empaqueta:

  ```json
  {
    "module_name": "@minecraft/server-ui",
    "version": "2.2.0"
  }
  ```

- La propia librería no debe usar módulos de Node.js (`node:fs`, etc.), porque no existen en el juego.
- Los imports internos de la librería están escritos sin extensión (`./propertiesFactory`), y los bundlers los resuelven. Si copias los archivos y tu entorno exige extensiones explícitas, añade `.js` a los imports relativos.

## Inicio rápido

```js
import { ObservableBoolean, ObservableString } from "@minecraft/server-ui";
import { customFormRender } from "../libs/bedrock-ddui-forms/index";

const createSettingsPage = (player) => ({
    title: "Ajustes",
    content: [
        { type: "header", text: "General" },
        { type: "spacer" },
        {
            type: "text-field",
            label: "Nombre",
            text: new ObservableString("Steve", { clientWritable: true })
        },
        {
            type: "toggle",
            label: "Activar función",
            toggled: new ObservableBoolean(true, { clientWritable: true })
        },
        { type: "divider" },
        { type: "close-button" }
    ]
});

export const openSettings = (player) => customFormRender(player, createSettingsPage(player));
```

> **Consejo:** define cada vista como una función (`createXPage(player)`) para que los `Observable` se creen de nuevo cada vez que se abre la vista y no se arrastre estado anterior.

## Elementos soportados

| `type` | Propiedades principales | Método de `CustomForm` |
| --- | --- | --- |
| `button` | `label`, `onClick?`, `to?`, `options?` | `button()` |
| `close-button` | – | `closeButton()` |
| `divider` | `options?` | `divider()` |
| `dropdown` | `label`, `value` (`ObservableNumber`), `items`, `options?` | `dropdown()` |
| `header` | `text`, `options?` | `header()` |
| `image` | `src`, `pack`, `options?` (`onClick`, `tooltip`, `visible`, `width`) | `image()` |
| `label` | `text`, `options?` | `label()` |
| `slider` | `label`, `value` (`ObservableNumber`), `min`, `max`, `options?` (`step`, …) | `slider()` |
| `spacer` | `options?` | `spacer()` |
| `text-field` | `label`, `text` (`ObservableString`), `options?` | `textField()` |
| `toggle` | `label`, `toggled` (`ObservableBoolean`), `options?` | `toggle()` |

`options` siempre coincide con el tipo de opciones correspondiente de `@minecraft/server-ui` (por ejemplo `SliderOptions`). `image.options.width` es una fracción del ancho del formulario (`0.5` es la mitad).

## Navegación

Un botón puede abrir otra vista con `to`. Se ejecuta **después** de `onClick`, cuando el formulario actual ya está cerrado, así que se pueden combinar:

```js
{
    type: "button",
    label: "Guardar y volver",
    onClick: function () { save(player); },   // se ejecuta primero
    to: () => openMainMenu(player)            // luego cierra este formulario y abre el siguiente
}
```

- Si el botón solo navega, usa `to`.
- Si hace algo más, usa `onClick`, y añade `to` si además debe navegar.
- Dentro de `onClick` y de `image.options.onClick`, `this` es el `CustomForm`, así que `this.close()` funciona si necesitas cerrar sin abrir nada.

Para muchas vistas, parámetros y un botón de volver automático, mira el [Router](#router-vistas-con-nombre-y-atrás).

## Router: vistas con nombre y "atrás"

Cuando tus menús crecen, conectar cada botón con el siguiente `openX(player)` se vuelve repetitivo. `createRouter` registra tus vistas por nombre, permite que los botones apunten a ellas y guarda un **historial por jugador** para que un botón pueda volver atrás.

```js
import { ObservableBoolean } from "@minecraft/server-ui";
import { createRouter } from "bedrock-ddui-forms/index";   // o desde tu carpeta libs/

const router = createRouter({
    menu: (player) => ({
        title: "Menú",
        content: [
            { type: "button", label: "Mi perfil", to: { view: "profile", params: { name: player.name } } },
            { type: "button", label: "Ajustes", to: "settings" },
            { type: "close-button" }
        ]
    }),

    profile: (player, params) => ({
        title: `Perfil: ${params.name}`,
        content: [
            { type: "label", text: "Todavía no hay nada aquí." },
            { type: "button", label: "Volver", to: "back" }
        ]
    }),

    settings: (player) => ({
        title: "Ajustes",
        content: [
            { type: "toggle", label: "Notificaciones", toggled: new ObservableBoolean(true, { clientWritable: true }) },
            { type: "button", label: "Volver", to: "back" }
        ]
    })
});

// Iniciar un flujo
router.open(player, "menu");
```

Cada vista es una función `(player, params) => formData`. Devuelve el mismo objeto que le darías a `customFormRender`, incluido `onExit`.

### Valores que acepta `to`

| `to` | Resultado |
| --- | --- |
| `"settings"` | Abre la vista registrada con ese nombre. |
| `{ view: "profile", params: { ... } }` | Lo mismo, pasándole `params` a la vista. |
| `"back"` | Vuelve a la vista anterior del historial del jugador. Si no hay ninguna, el formulario simplemente se cierra. |
| una función | Funciona como el `to` normal (ver [Navegación](#navegación)), pero queda **fuera** del router: el historial del jugador se descarta. |

Si usas el nombre de una vista que no registraste, el router lanza `Unknown View: "nombre"`.

### Parámetros

`params` es el segundo argumento de la función de la vista. Puedes pasarlos desde un botón (`to: { view, params }`) o al iniciar el flujo (`router.open(player, "profile", { name: "Alex" })`).

Qué pasas es decisión tuya. El router guarda los `params` de cada paso en el historial y los vuelve a usar al volver atrás, de modo que la vista se reconstruye con los mismos `params`. Por eso los datos simples (nombres, ids, números) son la opción más segura: una entidad o un objeto de jugador guardado ahí puede dejar de ser válido cuando el jugador regrese a esa vista.

Volver atrás **reconstruye** la vista llamando otra vez a su función, así que los valores que el jugador escribió (tus `Observable`) no se conservan: vuelven a sus valores iniciales.

### Opciones del router

```js
const router = createRouter(views, { onInvalid: "skip" });
```

El segundo argumento acepta las mismas opciones que el tercer argumento de `customFormRender` (ver [Validación y mensajes de error](#validación-y-mensajes-de-error)) y se aplica a todas las vistas.

### Qué devuelve `open`

`router.open(...)` devuelve una promesa que se resuelve con el motivo de cierre de **la vista que abrió**, no de todo el flujo. Cuando un botón navega, el servidor cierra esa vista, así que se resuelve con `ServerClosed`. El `onExit` de cada vista sigue la misma regla descrita en [Cerrar una vista](#cerrar-una-vista-onexit).

### Vida del historial y limpieza

El router guarda en memoria el historial de cada jugador. Se borra cuando:

- el jugador cierra el formulario,
- un formulario se cierra desde código sin navegar (por ejemplo `this.close()` dentro de `onClick`),
- vuelves a llamar a `router.open(...)`: un flujo nuevo siempre empieza limpio,
- llamas a `router.clear(playerId)`.

Si un jugador sale del servidor a mitad de un flujo, su historial queda en memoria hasta que ocurra una de esas cosas. Es una entrada pequeña por jugador, pero puedes liberarla cuando se vaya:

```js
import { world } from "@minecraft/server";

world.afterEvents.playerLeave.subscribe(({ playerId }) => router.clear(playerId));
```

La librería no se suscribe a este evento por ti, a propósito:

- así la librería depende solo de `@minecraft/server-ui`,
- crear un router no engancha ningún evento global,
- tú decides cómo y cuándo limpiar según tu addon.

Suscríbete **una sola vez** (como arriba), no una vez por vista: una suscripción por vista se iría acumulando mientras los jugadores sigan conectados.

## Leer valores

Los valores son los `Observable` que tú creas, así que guarda una referencia y léelos cuando los necesites:

```js
const createPage = (player) => {
    const name = new ObservableString("", { clientWritable: true });

    return {
        title: "Renombrar",
        content: [
            { type: "text-field", label: "Nuevo nombre", text: name },
            {
                type: "button",
                label: "Guardar",
                onClick: function () { rename(player, name.getData()); },
                to: () => openMainMenu(player)
            }
        ]
    };
};
```

## Cerrar una vista: `onExit`

`formData.onExit` se ejecuta cuando el formulario se cierra, por cualquier motivo excepto `UserBusy` (cuando el formulario no pudo mostrarse). `this` es el `CustomForm` y el primer argumento es el `DataDrivenScreenClosedReason`:

```js
{
    title: "Ajustes",
    content: [ /* ... */ ],
    onExit(reason) {
        // reason: ClientClosed | ServerClosed
    }
}
```

Cuando un botón navega con `to`, el servidor cierra el formulario actual, así que su `onExit` también se ejecuta, con `ServerClosed`, **después** de que `to` ya abrió la siguiente vista. Revisa `reason` si solo quieres reaccionar cuando el jugador cierra el formulario (`ClientClosed`).

## Validación y mensajes de error

Antes de abrir una vista, `customFormRender` revisa cada elemento y reporta **todos** los problemas que encuentra en un solo mensaje en la consola, con el lugar exacto de cada uno:

```
[bedrock-ddui-forms] View "Stored Inventory": 3 errors, 2 warnings
  ERROR   content[0] slider "Protection duration" > label: is required. Expected string | ObservableString | ObservableUIRawMessage | UIRawMessage.
  WARNING content[0] slider "Protection duration" > text: unknown property "text". Valid properties: label, value, min, max, options.
  WARNING content[0] slider "Protection duration" > options.steps: unknown option "steps". Did you mean "step"?
  ERROR   content[1] textfield "Owner" > type: unknown type "textfield". Did you mean "text-field"?
  ERROR   content[2] toggle "Keep armor" > toggled: expected ObservableBoolean, received boolean true. Create it with new ObservableBoolean(<initial value>, { clientWritable: true }).
```

Los mensajes están en inglés, igual que el resto de la salida de la librería.

- Los **errores** dejan el elemento inutilizable. Las **advertencias** señalan equivocaciones probables (propiedades u opciones desconocidas, un valor de dropdown que ningún item tiene, `min` mayor que `max`, un botón sin acción...) y no detienen nada.
- Los errores de escritura reciben una sugerencia ("Did you mean ...?"), y si pasas un valor simple donde se necesita un `Observable`, el mensaje explica cómo crearlo.
- También se detecta un error muy común: `to: openMenu(player)` llama a la función en vez de pasarla (`to: () => openMenu(player)`).
- Los errores lanzados dentro de `onClick`, `to`, `image.options.onClick` y `onExit` se registran con el elemento al que pertenecen, en vez de fallar en silencio.

Qué pasa con un elemento con errores lo decides tú, con el tercer argumento de `customFormRender`:

```js
customFormRender(player, formData, { onInvalid: "label" });  // por defecto
```

| `onInvalid` | Comportamiento |
| --- | --- |
| `"label"` | Muestra un marcador visible en su lugar (útil mientras desarrollas). |
| `"skip"` | Deja el elemento fuera (mejor en producción o con contenido que viene de fuera). |
| `"throw"` | No abre el formulario y lanza un `FormValidationError` (su propiedad `issues` lista todos los problemas). |

Si el problema está en la vista misma (falta `title`, `content` no es un arreglo, no hay `player`), el formulario no se puede construir: se registra el reporte y `customFormRender` devuelve `undefined`.

También puedes validar sin renderizar, por ejemplo en una prueba o con vistas que vienen de un servidor:

```js
import { validateForm } from "bedrock-ddui-forms";

const report = validateForm(formData, player);
report.errors;    // problemas que rompen un elemento
report.warnings;  // equivocaciones probables
report.message;   // el texto mostrado arriba
```

## Valor de retorno

`customFormRender(player, formData)` devuelve una promesa que se resuelve con el `DataDrivenScreenClosedReason` (`ClientClosed`, `ServerClosed` o `UserBusy`), o `undefined` si la vista no se pudo construir o hubo un error al mostrarla. Un resultado `UserBusy` además registra una advertencia.

## Estructura del proyecto

```
index.js                  punto de entrada público
core/
  customFormRender.js     renderiza una vista y la muestra al jugador
  propertiesFactory.js    asocia cada `type` con su llamada a CustomForm
  validation.js           revisa las vistas y construye los mensajes de error
  createRouter.js         vistas con nombre y historial de "atrás" por jugador
models/properties/
  *.js                    typedefs de JSDoc de cada elemento
```

## Añadir un tipo de elemento nuevo

1. Crea su typedef en `models/properties/` y añádelo a la unión `Property`.
2. Escribe su función en `propertiesFactory.js`.
3. Regístrala en la tabla `properties`.

## Aviso legal

Este proyecto no está afiliado, respaldado ni patrocinado por Mojang Studios ni Microsoft.
