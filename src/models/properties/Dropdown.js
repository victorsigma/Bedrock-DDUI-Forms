import { ObservableNumber } from "@minecraft/server-ui";

/**
 * Dropdown model
 * @typedef {Object} Dropdown
 * @property {string} type - The type of the dropdown (default: 'dropdown').
 * @property {string | ObservableString | ObservableUIRawMessage} label - The label of the dropdown (default: 'dropdown').
 * @property {ObservableNumber} value - The selected value of the dropdown (default: 0).
 * @property {{ label: string, value: number, description?: string }[]} items - The items in the dropdown (default: []).
 * @property {import("@minecraft/server-ui").DropdownOptions} [options] - Additional options for the dropdown (default: { description: '', disabled: false, visible: true }).
 */
export const Dropdown = {
    type: 'dropdown',
    label: 'dropdown',
    value: new ObservableNumber(0, { clientWritable: true }),
    items: [],
    options: {
        description: '',
        disabled: false,
        visible: true
    }
}