import { ObservableBoolean, ObservableString, ObservableUIRawMessage } from "@minecraft/server-ui";

/**
 * Header model
 * @typedef {Object} Header
 * @property {string} type - The type of the header (default: 'header').
 * @property {string | ObservableString | ObservableUIRawMessage} text - The text of the header (default: 'header').
 * @property {import("@minecraft/server-ui").TextOptions} [options] - Additional options for the header (default: { visible: true }).
 */
export const Header = {
    type: 'header',
    text: 'header',
    options: {
        visible: true
    }
}