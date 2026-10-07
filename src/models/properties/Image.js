import { ObservableString } from "@minecraft/server-ui";

/**
 * Image model
 * @typedef {Object} Image
 * @property {string} type - The type of the image (default: 'image').
 * @property {string | ObservableString} src - The source URL of the image (default: '').
 * @property {string | ObservableString} pack - The resource pack of the image (default: '').
 * @property {Object} [options] - Additional options for the image (default: { onClick: () => {}, tooltip: '', visible: true, width: 0 }).
 * @property {Function} [options.onClick] - The function to be called when the image is clicked (default: () => {}).
 * @property {string | ObservableString | ObservableUIRawMessage} [options.tooltip] - The tooltip text for the image (default: '').
 * @property {boolean | ObservableBoolean} [options.visible] - Whether the image is visible (default: true).
 * @property {number | ObservableNumber} [options.width] - The width of the image (default: 0).
 */
export const Image = {
    type: 'image',
    src: '',
    pack: '',
    options: {
        onClick: () => { },
        tooltip: '',
        visible: true,
        width: 0
    }
}