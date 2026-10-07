import { CustomForm, DataDrivenScreenClosedReason, ObservableString, ObservableUIRawMessage } from "@minecraft/server-ui";
import { propertiesFactory } from "./propertiesFactory";
import { FormValidationError, logCallbackError, validateForm } from "./validation";

/**
 * @typedef {Object} FormData
 * @property {ObservableString | ObservableUIRawMessage | string} title
 * @property {import("../models/properties/Property").Property[]} content
 * @property {(this: CustomForm, reason: DataDrivenScreenClosedReason) => void} [onExit] - Runs after the form closes, for any reason except `UserBusy`.
 */

/**
 * @typedef {Object} RenderOptions
 * @property {"label" | "skip" | "throw"} [onInvalid] - What to do with elements that have errors.
 *  - `"label"` (default): show a visible placeholder in their place.
 *  - `"skip"`: leave them out of the form.
 *  - `"throw"`: do not open the form and throw a `FormValidationError`.
 */

/**
 * @param {import("@minecraft/server").Player} player
 * @param {FormData} formData
 * @param {RenderOptions} [options]
 * @returns {Promise<DataDrivenScreenClosedReason | undefined>} Motivo de cierre, o undefined si la vista no pudo mostrarse.
 */
export const customFormRender = async (player, formData, options = {}) => {
    const { onInvalid = "label" } = options;

    const report = validateForm(formData, player);

    if (report.errors.length) {
        console.error(report.message);
    } else if (report.warnings.length) {
        console.warn(report.message);
    }

    if (report.errors.length && onInvalid === "throw") {
        throw new FormValidationError(report);
    }
    if (report.fatal) return undefined;

    let view = new CustomForm(player, formData.title);

    formData.content.forEach((property, index) => {
        const path = `content[${index}] ${property?.type ?? "element"}`;

        if (report.invalid.has(index)) {
            if (onInvalid !== "skip") view = placeholder(view, path);
            return;
        }

        try {
            view = propertiesFactory(view, property);
        } catch (e) {
            console.error(`[bedrock-ddui-forms] ${path}: the API rejected this element: ${e?.message ?? e}`);
            if (onInvalid === "skip") return;
            view = placeholder(view, path);
        }
    });

    try {
        const reason = await view.show();

        if (reason === DataDrivenScreenClosedReason.UserBusy) {
            console.warn("[bedrock-ddui-forms]: The player is busy with another UI.");
        } else {
            runOnExit(view, formData.onExit, reason);
        }

        return reason;
    } catch (e) {
        console.warn(`[bedrock-ddui-forms]: ${e}`);
    }
}

/** Runs `onExit` on its own, so an error inside it is reported as such and does not look like a failure of show(). */
const runOnExit = (view, onExit, reason) => {
    if (typeof onExit !== "function") return;

    try {
        onExit.call(view, reason);
    } catch (e) {
        logCallbackError("onExit", e);
    }
};

/** Visible stand-in for an element that could not be built. */
const placeholder = (view, path) => view.label(`[invalid element] ${path} (see the console)`);
