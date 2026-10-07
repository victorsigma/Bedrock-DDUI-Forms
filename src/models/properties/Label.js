import { ObservableBoolean, ObservableString, ObservableUIRawMessage } from "@minecraft/server-ui";

/**
 * Label model
 * @typedef {Object} Label
 * @property {string} type - The type of the label (default: 'label').
 * @property {string | ObservableString | ObservableUIRawMessage} text - The text of the label (default: 'label').
 * @property {import("@minecraft/server-ui").TextOptions} [options] - Additional options for the label (default: { visible: true }).
 */
export const Label = {
    type: 'label',
    text: 'label',
    options: {
        visible: true
    }
}