import { ObservableNumber, ObservableString, ObservableUIRawMessage } from "@minecraft/server-ui";

/**
 * Slider model
 * @typedef {Object} Slider
 * @property {string} type - The type of the slider (default: 'slider').
 * @property {string | ObservableString | ObservableUIRawMessage} label - The label of the slider (default: 'slider').
 * @property {ObservableNumber} value - The current value of the slider (default: 0).
 * @property {number | ObservableNumber} min - The minimum value of the slider (default: 0).
 * @property {number | ObservableNumber} max - The maximum value of the slider (default: 100).
 * @property {import("@minecraft/server-ui").SliderOptions} [options] - Additional options for the slider (default: { description: '', disabled: false, step: 1, visible: true }).
 */
export const Slider = {
    type: 'slider',
    label: 'slider',
    value: new ObservableNumber(0, { clientWritable: true }),
    min: 0,
    max: 100,
    options: {
        description: '',
        disabled: false,
        step: 1,
        visible: true
    }
}