# bedrock-ddui-forms

> 🇬🇧 English · [🇪🇸 Español](./README.es.md)

A declarative layer for building `@minecraft/server-ui` **DDUI** forms (`CustomForm`) from plain objects.

Instead of chaining calls on `CustomForm`, you describe a view as data and let a renderer translate it:

```js
{
    title: "Settings",
    content: [
        { type: "header", text: "General" },
        { type: "toggle", label: "Enable feature", toggled: new ObservableBoolean(true, { clientWritable: true }) },
        { type: "close-button" }
    ]
}
```

> Not affiliated with Mojang or Microsoft. "Minecraft" and "Bedrock" are used only to describe the platform this library targets.

## Features

- **Declarative views**: a form is an object with a `title` and a `content` array.
- **Typed with the official API**: models are JSDoc typedefs that reuse the types of `@minecraft/server-ui` (`ButtonOptions`, `SliderOptions`, …), so they stay in sync with the module.
- **Simple navigation**: a button can open another view with `to`, composed with `onClick`.
- **Easy to extend**: adding a new element type is one entry in a lookup table and one function.
- **Safe fallback**: an unsupported `type` renders a visible label and logs a warning instead of breaking the whole form.

## Requirements

- `@minecraft/server-ui` **2.2.0** (stable)

## Installation

Minecraft's script engine does **not** resolve npm packages (there is no `node_modules` inside the game). Only the `@minecraft/*` modules declared in the `manifest.json` are provided by the game, so the library has to end up as files inside your addon's `scripts/` folder. There are two ways to do it.

### Option 1: copy the files

Copy the library into your behavior pack and import it with relative paths:

```
BP/
  manifest.json
  scripts/
    main.js
    lib/bedrock-ddui-forms/
      index.js
      core/
      models/
    views/
```

```js
import { customFormRender } from "../libs/bedrock-ddui-forms/index";
```

No tooling needed, but you have to copy the files again to update.

### Option 2: use a bundler (recommended if you install from npm)

```bash
npm install bedrock-ddui-forms
```

Then bundle your code and the library into a single file inside `scripts/`. For example, with [esbuild](https://esbuild.github.io/):

```bash
npx esbuild src/index.js --bundle --format=esm --outfile=scripts/libs/bedrock-ddui-forms/index.js --external:@minecraft/server --external:@minecraft/server-ui
```

The `--external` flags are important: the `@minecraft/*` modules are provided by the game and must not be bundled. With this flow, `npm update` is enough to update the library.

### Always required

- Declare `@minecraft/server-ui` in your `manifest.json` (this library targets version `2.2.0`). It is never copied or bundled:

  ```json
  {
    "module_name": "@minecraft/server-ui",
    "version": "2.2.0"
  }
  ```

- The library itself must not use Node.js modules (`node:fs`, etc.), because they don't exist in the game.
- The library's internal imports are written without file extensions (`./propertiesFactory`), which bundlers resolve. If you copy the files and your setup requires explicit extensions, add `.js` to the relative imports.

## Quick start

```js
import { ObservableBoolean, ObservableString } from "@minecraft/server-ui";
import { customFormRender } from "../libs/bedrock-ddui-forms/index";

const createSettingsPage = (player) => ({
    title: "Settings",
    content: [
        { type: "header", text: "General" },
        { type: "spacer" },
        {
            type: "text-field",
            label: "Name",
            text: new ObservableString("Steve", { clientWritable: true })
        },
        {
            type: "toggle",
            label: "Enable feature",
            toggled: new ObservableBoolean(true, { clientWritable: true })
        },
        { type: "divider" },
        { type: "close-button" }
    ]
});

export const openSettings = (player) => customFormRender(player, createSettingsPage(player));
```

> **Tip:** define each view as a function (`createXPage(player)`) so the `Observable` values are created again every time the view is opened and no old state is carried over.

## Supported elements

| `type` | Main properties | `CustomForm` method |
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

`options` always matches the corresponding options type of `@minecraft/server-ui` (for example `SliderOptions`). `image.options.width` is a fraction of the form width (`0.5` is half).

## Navigation

A button can open another view with `to`. It runs **after** `onClick`, once the current form is closed, so both can be combined:

```js
{
    type: "button",
    label: "Save and go back",
    onClick: function () { save(player); },   // runs first
    to: () => openMainMenu(player)            // then closes this form and opens the next one
}
```

- If you only navigate, use `to`.
- If the button does something else, use `onClick`, and add `to` if it should also navigate.
- Inside `onClick` and `image.options.onClick`, `this` is the `CustomForm`, so `this.close()` works if you need to close without opening anything.

## Reading values

The values are the `Observable` objects you create, so keep a reference and read them when you need them:

```js
const createPage = (player) => {
    const name = new ObservableString("", { clientWritable: true });

    return {
        title: "Rename",
        content: [
            { type: "text-field", label: "New name", text: name },
            {
                type: "button",
                label: "Save",
                onClick: function () { rename(player, name.getData()); },
                to: () => openMainMenu(player)
            }
        ]
    };
};
```

## Closing a view: `onExit`

`formData.onExit` runs after the form closes, for any reason except `UserBusy` (when the form could not be shown at all). `this` is the `CustomForm` and the first argument is the `DataDrivenScreenClosedReason`:

```js
{
    title: "Settings",
    content: [ /* ... */ ],
    onExit(reason) {
        // reason: ClientClosed | ServerClosed
    }
}
```

When a button navigates with `to`, the current form is closed by the server, so its `onExit` also runs, with `ServerClosed`, **after** `to` has already opened the next view. Check `reason` if you only want to react when the player closes the form (`ClientClosed`).

## Validation and error messages

Before opening a view, `customFormRender` checks every element and reports **all** the problems it finds in one message in the console, with the exact place of each one:

```
[bedrock-ddui-forms] View "Stored Inventory": 3 errors, 2 warnings
  ERROR   content[0] slider "Protection duration" > label: is required. Expected string | ObservableString | ObservableUIRawMessage | UIRawMessage.
  WARNING content[0] slider "Protection duration" > text: unknown property "text". Valid properties: label, value, min, max, options.
  WARNING content[0] slider "Protection duration" > options.steps: unknown option "steps". Did you mean "step"?
  ERROR   content[1] textfield "Owner" > type: unknown type "textfield". Did you mean "text-field"?
  ERROR   content[2] toggle "Keep armor" > toggled: expected ObservableBoolean, received boolean true. Create it with new ObservableBoolean(<initial value>, { clientWritable: true }).
```

- **Errors** make the element unusable. **Warnings** point at likely mistakes (unknown properties or options, a dropdown value that no item has, `min` greater than `max`, a button with no action...) and do not stop anything.
- Typos get a "Did you mean ...?" suggestion, and passing a plain value where an `Observable` is needed explains how to create it.
- A common mistake is also caught: `to: openMenu(player)` calls the function instead of passing it (`to: () => openMenu(player)`).
- Errors thrown inside `onClick`, `to`, `image.options.onClick` and `onExit` are logged with the element they belong to instead of failing silently.

What happens to an element with errors is up to you, with the third argument of `customFormRender`:

```js
customFormRender(player, formData, { onInvalid: "label" });  // default
```

| `onInvalid` | Behaviour |
| --- | --- |
| `"label"` | Shows a visible placeholder in its place (handy while developing). |
| `"skip"` | Leaves the element out (better for production or for content you load from outside). |
| `"throw"` | Does not open the form and throws a `FormValidationError` (its `issues` property lists every problem). |

If the problem is in the view itself (`title` missing, `content` not an array, no `player`), the form cannot be built: the report is logged and `customFormRender` returns `undefined`.

You can also validate without rendering, for example in a test or for views that come from a server:

```js
import { validateForm } from "bedrock-ddui-forms";

const report = validateForm(formData, player);
report.errors;    // problems that break an element
report.warnings;  // likely mistakes
report.message;   // the text shown above
```

## Return value

`customFormRender(player, formData)` returns a promise that resolves with the `DataDrivenScreenClosedReason` (`ClientClosed`, `ServerClosed` or `UserBusy`), or `undefined` if the view could not be built or an error occurred while showing it. A `UserBusy` result also logs a warning.

## Project layout

```
index.js                  public entry point
core/
  customFormRender.js     renders a view and shows it to the player
  propertiesFactory.js    maps each `type` to its CustomForm call
  validation.js           checks views and builds the error messages
models/properties/
  *.js                    JSDoc typedefs for each element
```

## Adding a new element type

1. Create its typedef in `models/properties/` and add it to the `Property` union.
2. Write its function in `propertiesFactory.js`.
3. Register it in the `properties` table.

## Disclaimer

This project is not affiliated with, endorsed by, or sponsored by Mojang Studios or Microsoft.
