import { ObservableBoolean, ObservableString, ObservableUIRawMessage } from "@minecraft/server-ui";

/**
 * Button model
 * @typedef {Object} Button
 * @property {string} type - The type of the button (default: 'button').
 * @property {string | ObservableString | ObservableUIRawMessage} label - The label of the button (default: '').
 * @property {Function} onClick - The function to be called when the button is clicked (default: () => {}).
 * @property {Function} [to] - The function that will be executed after onClick; this property closes the view before executing the declared call. (default: () => {}).
 * @property {Object} [options] - Additional options for the button (default: { disabled: false, tooltip: '', visible: true }).
 * @property {boolean | ObservableBoolean} [options.disabled] - Whether the button is disabled (default: false).
 * @property {string | ObservableString | ObservableUIRawMessage} [options.tooltip] - The tooltip text for the button (default: '').
 * @property {boolean | ObservableBoolean} [options.visible] - Whether the button is visible (default: true).
 */
export const Button = {
    type: 'button',
    label: 'button',
    onClick: () => { },
    to: () => { },
    options: {
        disabled: false,
        tooltip: '',
        visible: true
    }
}

/**
 * CloseButton model
 * @typedef {Object} CloseButton
 * @property {string} type - The type of the close-button (default: 'close-button').
 */
export const CloseButton = {
    type: 'close-button'
}