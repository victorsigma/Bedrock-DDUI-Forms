import { ObservableString, ObservableUIRawMessage } from "@minecraft/server-ui";

/**
 * TextField model
 * @typedef {Object} TextField
 * @property {string} type - The type of the text-field (default: 'text-field').
 * @property {string | ObservableString | ObservableUIRawMessage} label - The label of the text-field (default: 'text-field').
 * @property {ObservableString} text - The observable text value of the text-field.
 * @property {import("@minecraft/server-ui").TextFieldOptions} options - Additional options for the text-field.
 */
export const TextField = {
    type: 'text-field',
    label: 'text-field',
    text: new ObservableString('text-field', { clientWritable: true }),
    options: {
        description: '',
        disabled: false,
        visible: true
    }
}