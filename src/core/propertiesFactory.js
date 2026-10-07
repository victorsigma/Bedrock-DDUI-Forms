import { CustomForm } from "@minecraft/server-ui";
import { Button, CloseButton } from "../models/properties/Button";
import { Divider } from "../models/properties/Divider";
import { Dropdown } from "../models/properties/Dropdown";
import { Header } from "../models/properties/Header";
import { Image } from "../models/properties/Image";
import { Label } from "../models/properties/Label";
import { Slider } from "../models/properties/Slider";
import { Spacer } from "../models/properties/Spacer";
import { TextField } from "../models/properties/TextField";
import { Toggle } from "../models/properties/Toggle";
import { Property } from "../models/properties/Property";
import { logCallbackError } from "./validation";

const properties = {
    "button": (view, props) => button(view, props),
    "close-button": (view, props) => closeButton(view, props),
    "divider": (view, props) => divider(view, props),
    "dropdown": (view, props) => dropdown(view, props),
    "header": (view, props) => header(view, props),
    "image": (view, props) => image(view, props),
    "label": (view, props) => label(view, props),
    "slider": (view, props) => slider(view, props),
    "spacer": (view, props) => spacer(view, props),
    "text-field": (view, props) => textField(view, props),
    "toggle": (view, props) => toggle(view, props)
};

/**
 * @param {CustomForm} view 
 * @param {Property} property 
 * @returns {CustomForm}
 */
export const propertiesFactory = (view, property) => {
    const factory = properties[property.type] != undefined ? properties[property.type] : undefined;

    if (factory) {
        view = factory(view, property);
    } else {
        view = label(view, { type: "label", text: `Property type ${property.type} is not supported.`, options: { visible: true } });
        console.warn(`Property type ${property.type} is not supported.`);
    }
    return view;
}

/**
 * @param {CustomForm} view 
 * @param {Button} props 
 * @returns {CustomForm}
 */
const button = (view, props = Button) => {
    const onClick = () => {
        try {
            props.onClick?.call(view);

            if (props.to) {
                if (view.isShowing()) view.close();
                props.to();
            }
        } catch (e) {
            logCallbackError(`button "${typeof props.label === "string" ? props.label : ""}"`, e);
        }
    };

    view.button(props.label, onClick, props.options);

    return view;
}

/**
 * @param {CustomForm} view 
 * @param {CloseButton} props 
 * @returns {CustomForm}
 */
const closeButton = (view, props = {}) => {
    view.closeButton();

    return view;
}

/**
 * @param {CustomForm} view 
 * @param {Divider} props 
 * @returns {CustomForm}
 */
const divider = (view, props = { options: {} }) => {
    view.divider(props.options);

    return view;
}

/**
 * @param {CustomForm} view 
 * @param {Dropdown} props 
 * @returns {CustomForm}
 */
const dropdown = (view, props = Dropdown) => {
    view.dropdown(props.label, props.value, props.items, props.options);

    return view;
}

/**
 * @param {CustomForm} view 
 * @param {Header} props 
 * @returns {CustomForm}
 */
const header = (view, props) => {
    view.header(props.text, props.options);

    return view;
}

/**
 * @param {CustomForm} view 
 * @param {Image} props 
 * @returns {CustomForm}
 */
const image = (view, props = Image) => {
    const options = { ...props.options };
    if (typeof options.onClick === "function") {
        const handler = options.onClick;
        options.onClick = () => {
            try {
                handler.call(view);
            } catch (e) {
                logCallbackError(`image "${typeof props.src === "string" ? props.src : ""}"`, e);
            }
        };
    }

    view.image(props.src, props.pack, options);

    return view;
}

/**
 * @param {CustomForm} view 
 * @param {Label} props 
 * @returns {CustomForm}
 */
const label = (view, props = Label) => {
    view.label(props.text, props.options);

    return view;
}

/**
 * @param {CustomForm} view 
 * @param {Slider} props 
 * @returns {CustomForm}
 */
const slider = (view, props = Slider) => {
    view.slider(props.label, props.value, props.min, props.max, props.options);

    return view;
}

/**
 * @param {CustomForm} view 
 * @param {Spacer} props 
 * @returns {CustomForm}
 */
const spacer = (view, props = Spacer) => {
    view.spacer(props.options);

    return view;
}

/**
 * @param {CustomForm} view 
 * @param {TextField} props 
 * @returns {CustomForm}
 */
const textField = (view, props = TextField) => {
    view.textField(props.label, props.text, props.options);

    return view;
}

/**
 * @param {CustomForm} view 
 * @param {Toggle} props 
 * @returns {CustomForm}
 */
const toggle = (view, props = Toggle) => {
    view.toggle(props.label, props.toggled, props.options);

    return view;
}