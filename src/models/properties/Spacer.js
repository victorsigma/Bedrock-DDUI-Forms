/**
 * Spacer model
 * @typedef {Object} Spacer
 * @property {string} type - The type of the slider (default: 'spacer').
 * @property {import("@minecraft/server-ui").SpacingOptions} options - Additional options for the spacer.
 */
export const Spacer = {
    type: 'spacer',
    options: {
        visible: true
    }
}