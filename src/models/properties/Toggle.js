import { ObservableString, ObservableUIRawMessage, ObservableBoolean } from "@minecraft/server-ui";

/**
 * Toggle model
 * @typedef {Object} Toggle
 * @property {string} type - The type of the toggle (default: 'toggle').
 * @property {string | ObservableString | ObservableUIRawMessage} label - The label of the toggle (default: 'toggle').
 * @property {ObservableBoolean} toggled - An ObservableBoolean that holds the current on/off state of the toggle..
 * @property {import("@minecraft/server-ui").ToggleOptions} options - Additional options for the toggle.
 */
export const Toggle = {
    type: 'toggle',
    label: 'toggle',
    toggled: new ObservableBoolean(false, { clientWritable: true }),
    options: {
        description: '',
        disabled: false,
        visible: true
    }
}