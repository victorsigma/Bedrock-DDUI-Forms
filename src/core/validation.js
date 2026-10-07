import { ObservableBoolean, ObservableNumber, ObservableString, ObservableUIRawMessage } from "@minecraft/server-ui";

const PREFIX = "[bedrock-ddui-forms]";

/**
 * @typedef {Object} ValidationIssue
 * @property {"error" | "warning"} level
 * @property {string} path - Where the problem is, e.g. `content[3] slider "Marker range"`.
 * @property {string} field - The property involved, e.g. `label` or `options.step`.
 * @property {string} message
 * @property {boolean} [fatal] - The view cannot be built at all.
 */

/**
 * @typedef {Object} ValidationReport
 * @property {ValidationIssue[]} issues
 * @property {ValidationIssue[]} errors
 * @property {ValidationIssue[]} warnings
 * @property {boolean} fatal - The view cannot be built (bad player, title or content).
 * @property {Set<number>} invalid - Indexes of the `content` elements that have errors.
 * @property {string} message - Human readable report, ready to print.
 */

/** Thrown by `customFormRender` when `onInvalid` is `"throw"`. */
export class FormValidationError extends Error {
    /** @param {ValidationReport} report */
    constructor(report) {
        super(report.message);
        this.name = "FormValidationError";
        this.issues = report.issues;
    }
}

// ---------------------------------------------------------------------------
// Value kinds
// ---------------------------------------------------------------------------

const isRawMessage = (v) =>
    v !== null && typeof v === "object" && !Array.isArray(v) && ["text", "translate", "rawtext"].some((k) => k in v);

const isUIText = (v) =>
    typeof v === "string" || v instanceof ObservableString || v instanceof ObservableUIRawMessage || isRawMessage(v);

const KINDS = {
    text: { expected: "string | ObservableString | ObservableUIRawMessage | UIRawMessage", test: isUIText },
    string: { expected: "string | ObservableString", test: (v) => typeof v === "string" || v instanceof ObservableString },
    boolean: { expected: "boolean | ObservableBoolean", test: (v) => typeof v === "boolean" || v instanceof ObservableBoolean },
    plainNumber: { expected: "number", test: (v) => typeof v === "number" && Number.isFinite(v) },
    number: { expected: "number | ObservableNumber", test: (v) => (typeof v === "number" && Number.isFinite(v)) || v instanceof ObservableNumber },
    function: { expected: "function", test: (v) => typeof v === "function" },
    ObservableNumber: { expected: "ObservableNumber", test: (v) => v instanceof ObservableNumber },
    ObservableString: { expected: "ObservableString", test: (v) => v instanceof ObservableString },
    ObservableBoolean: { expected: "ObservableBoolean", test: (v) => v instanceof ObservableBoolean }
};

const OPTION_KINDS = {
    visible: "boolean",
    disabled: "boolean",
    tooltip: "text",
    description: "text",
    step: "number",
    width: "number",
    onClick: "function"
};

const describe = (v) => {
    if (v === undefined) return "undefined";
    if (v === null) return "null";
    if (typeof v === "string") return `string ${JSON.stringify(v.length > 30 ? `${v.slice(0, 27)}...` : v)}`;
    if (typeof v === "number" || typeof v === "boolean") return `${typeof v} ${v}`;
    if (typeof v === "function") return "function";
    if (Array.isArray(v)) return "array";
    const name = v.constructor?.name;
    return name && name !== "Object" ? name : "object";
};

const hintFor = (kindName, value) => {
    if (kindName.startsWith("Observable") && value !== undefined && value !== null && typeof value !== "object") {
        return ` Create it with new ${kindName}(<initial value>, { clientWritable: true }).`;
    }
    if (kindName === "function") {
        return " Pass a function (e.g. () => doSomething()), do not call it.";
    }
    return "";
};

// ---------------------------------------------------------------------------
// "Did you mean ...?"
// ---------------------------------------------------------------------------

const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, "");

const distance = (a, b) => {
    const row = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 1; i <= a.length; i++) {
        let prev = row[0];
        row[0] = i;
        for (let j = 1; j <= b.length; j++) {
            const tmp = row[j];
            row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
            prev = tmp;
        }
    }
    return row[b.length];
};

const suggest = (value, candidates) => {
    const n = norm(value);
    const exact = candidates.find((c) => norm(c) === n);
    if (exact) return exact;

    let best = null;
    let bestDistance = Infinity;
    for (const c of candidates) {
        const d = distance(n, norm(c));
        if (d < bestDistance) {
            best = c;
            bestDistance = d;
        }
    }
    return bestDistance <= 2 && bestDistance < n.length ? best : null;
};

const PLURALS = { property: "properties", option: "options" };

const unknownMessage = (key, known, noun) => {
    const s = suggest(key, known);
    return `unknown ${noun} "${key}".` + (s ? ` Did you mean "${s}"?` : ` Valid ${PLURALS[noun]}: ${known.join(", ")}.`);
};

// ---------------------------------------------------------------------------
// Collector: gathers the issues of ONE element
// ---------------------------------------------------------------------------

const read = (observable) => {
    try {
        return observable.getData();
    } catch {
        return undefined;
    }
};

class Collector {
    constructor(path) {
        this.path = path;
        /** @type {ValidationIssue[]} */
        this.issues = [];
    }

    error(field, message) {
        this.issues.push({ level: "error", path: this.path, field, message });
    }

    warn(field, message) {
        this.issues.push({ level: "warning", path: this.path, field, message });
    }

    /** Checks that `obj[key]` is of the given kind. Returns true when it is. */
    expect(obj, key, kindName, { required = true, as = key } = {}) {
        const kind = KINDS[kindName];

        if (!(key in obj)) {
            if (required) this.error(as, `is required. Expected ${kind.expected}.`);
            return false;
        }

        const value = obj[key];
        if (kind.test(value)) return true;

        this.error(as, `expected ${kind.expected}, received ${describe(value)}.${hintFor(kindName, value)}`);
        return false;
    }

    /** Checks `options`: it must be an object, with known keys and valid values. */
    options(prop, allowed) {
        if (!("options" in prop) || prop.options === undefined) return;

        const options = prop.options;
        if (options === null || typeof options !== "object" || Array.isArray(options)) {
            this.error("options", `expected an object, received ${describe(options)}.`);
            return;
        }

        for (const key of Object.keys(options)) {
            if (!allowed.includes(key)) {
                this.warn(`options.${key}`, unknownMessage(key, allowed, "option"));
            } else if (options[key] !== undefined) {
                this.expect(options, key, OPTION_KINDS[key], { as: `options.${key}` });
            }
        }
    }

    /** Warns about keys of the element that the library does not know. */
    unknownKeys(prop, known) {
        for (const key of Object.keys(prop)) {
            if (key !== "type" && !known.includes(key)) {
                this.warn(key, unknownMessage(key, known, "property"));
            }
        }
    }
}

// ---------------------------------------------------------------------------
// Element schemas
// ---------------------------------------------------------------------------

const checkButton = (c, p) => {
    c.expect(p, "label", "text");
    const hasOnClick = "onClick" in p && c.expect(p, "onClick", "function", { required: false });
    const hasTo = "to" in p && c.expect(p, "to", "function", { required: false });
    if (!("onClick" in p) && !("to" in p)) {
        c.warn("onClick", "the button has neither onClick nor to, so pressing it will do nothing.");
    }
    return hasOnClick || hasTo;
};

const checkDropdown = (c, p) => {
    c.expect(p, "label", "text");
    const hasValue = c.expect(p, "value", "ObservableNumber");

    if (!("items" in p)) {
        c.error("items", "is required. Expected an array of { label, value }.");
        return;
    }
    if (!Array.isArray(p.items)) {
        c.error("items", `expected an array of { label, value }, received ${describe(p.items)}.`);
        return;
    }

    const values = [];
    p.items.forEach((item, i) => {
        const at = `items[${i}]`;
        if (item === null || typeof item !== "object" || Array.isArray(item)) {
            c.error(at, `expected an object like { label: "Name", value: 0 }, received ${describe(item)}.`);
            return;
        }
        c.expect(item, "label", "text", { as: `${at}.label` });
        if (c.expect(item, "value", "plainNumber", { as: `${at}.value` })) values.push(item.value);
        if ("description" in item) c.expect(item, "description", "text", { required: false, as: `${at}.description` });
    });

    if (p.items.length === 0) {
        c.warn("items", "is empty, so there is nothing to select.");
    }
    if (new Set(values).size !== values.length) {
        c.warn("items", "several items share the same value; the selection will be ambiguous.");
    }
    if (hasValue && values.length > 0) {
        const current = read(p.value);
        if (typeof current === "number" && !values.includes(current)) {
            c.warn("value", `the observable holds ${current}, but no item has that value (item values: ${values.join(", ")}).`);
        }
    }
};

const checkSlider = (c, p) => {
    c.expect(p, "label", "text");
    const hasValue = c.expect(p, "value", "ObservableNumber");
    const hasMin = c.expect(p, "min", "number");
    const hasMax = c.expect(p, "max", "number");

    const min = hasMin && typeof p.min === "number" ? p.min : undefined;
    const max = hasMax && typeof p.max === "number" ? p.max : undefined;

    if (min !== undefined && max !== undefined && min >= max) {
        c.warn("min", `min (${min}) should be lower than max (${max}).`);
    }
    if (hasValue && min !== undefined && max !== undefined) {
        const current = read(p.value);
        if (typeof current === "number" && (current < min || current > max)) {
            c.warn("value", `the observable holds ${current}, which is outside the range ${min} to ${max}.`);
        }
    }
    if (typeof p.options?.step === "number" && p.options.step <= 0) {
        c.warn("options.step", `step should be greater than 0, received ${p.options.step}.`);
    }
};

const SCHEMAS = {
    "button": { keys: ["label", "onClick", "to", "options"], options: ["disabled", "tooltip", "visible"], check: checkButton },
    "close-button": { keys: [], options: [], check: () => { } },
    "divider": { keys: ["options"], options: ["visible"], check: () => { } },
    "dropdown": { keys: ["label", "value", "items", "options"], options: ["description", "disabled", "visible"], check: checkDropdown },
    "header": { keys: ["text", "options"], options: ["visible"], check: (c, p) => c.expect(p, "text", "text") },
    "image": {
        keys: ["src", "pack", "options"],
        options: ["onClick", "tooltip", "visible", "width"],
        check: (c, p) => {
            c.expect(p, "src", "string");
            c.expect(p, "pack", "string");
        }
    },
    "label": { keys: ["text", "options"], options: ["visible"], check: (c, p) => c.expect(p, "text", "text") },
    "slider": { keys: ["label", "value", "min", "max", "options"], options: ["description", "disabled", "step", "visible"], check: checkSlider },
    "spacer": { keys: ["options"], options: ["visible"], check: () => { } },
    "text-field": {
        keys: ["label", "text", "options"],
        options: ["description", "disabled", "visible"],
        check: (c, p) => {
            c.expect(p, "label", "text");
            c.expect(p, "text", "ObservableString");
        }
    },
    "toggle": {
        keys: ["label", "toggled", "options"],
        options: ["description", "disabled", "visible"],
        check: (c, p) => {
            c.expect(p, "label", "text");
            c.expect(p, "toggled", "ObservableBoolean");
        }
    }
};

export const SUPPORTED_TYPES = Object.keys(SCHEMAS);

const describeElement = (p) => {
    const name = typeof p?.label === "string" ? p.label : typeof p?.text === "string" ? p.text : "";
    const text = name.length > 30 ? `${name.slice(0, 27)}...` : name;
    return `${typeof p?.type === "string" ? p.type : "element"}${text ? ` "${text}"` : ""}`;
};

/**
 * Validates one element of `content`.
 * @param {unknown} property
 * @param {string} path - e.g. `content[3]`
 * @returns {ValidationIssue[]}
 */
export const validateProperty = (property, path) => {
    if (property === null || typeof property !== "object" || Array.isArray(property)) {
        return [{
            level: "error",
            path,
            field: "",
            message: `expected an object like { type: "label", text: "Hello" }, received ${describe(property)}.`
        }];
    }

    const c = new Collector(`${path} ${describeElement(property)}`);
    const type = property.type;

    if (typeof type !== "string") {
        c.error("type", `is required. Valid types: ${SUPPORTED_TYPES.join(", ")}.`);
        return c.issues;
    }

    if (!Object.hasOwn(SCHEMAS, type)) {
        const s = suggest(type, SUPPORTED_TYPES);
        c.error("type", `unknown type "${type}".` + (s ? ` Did you mean "${s}"?` : ` Valid types: ${SUPPORTED_TYPES.join(", ")}.`));
        return c.issues;
    }

    const schema = SCHEMAS[type];
    c.unknownKeys(property, schema.keys);
    schema.check(c, property);
    c.options(property, schema.options);

    // Errors first, then warnings (the sort is stable)
    return c.issues.sort((a, b) => (a.level === b.level ? 0 : a.level === "error" ? -1 : 1));
};

// ---------------------------------------------------------------------------
// Whole form
// ---------------------------------------------------------------------------

const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

const formatReport = (title, issues) => {
    const errors = issues.filter((i) => i.level === "error").length;
    const warnings = issues.length - errors;

    const counts = [errors && plural(errors, "error"), warnings && plural(warnings, "warning")].filter(Boolean).join(", ");
    const header = `${PREFIX} View${typeof title === "string" && title ? ` "${title}"` : ""}: ${counts}`;

    const lines = issues.map((i) => {
        const where = i.field ? `${i.path} > ${i.field}` : i.path;
        return `  ${i.level === "error" ? "ERROR  " : "WARNING"} ${where}: ${i.message}`;
    });

    return [header, ...lines].join("\n");
};

/**
 * Validates a whole view before it is rendered.
 * @param {unknown} formData - `{ title, content }`
 * @param {unknown} [player]
 * @returns {ValidationReport}
 */
export const validateForm = (formData, player) => {
    /** @type {ValidationIssue[]} */
    const issues = [];
    const invalid = new Set();
    const fatal = (path, message) => issues.push({ level: "error", path, field: "", message, fatal: true });

    if (!player || typeof player !== "object") {
        fatal("player", `expected a Player, received ${describe(player)}.`);
    }

    if (formData === null || typeof formData !== "object" || Array.isArray(formData)) {
        fatal("formData", `expected an object like { title, content }, received ${describe(formData)}.`);
    } else {
        const c = new Collector("formData");
        c.unknownKeys(formData, ["title", "content", "onExit"]);
        if ("onExit" in formData) c.expect(formData, "onExit", "function", { required: false });
        issues.push(...c.issues);

        if (!isUIText(formData.title)) {
            fatal("formData.title", `expected ${KINDS.text.expected}, received ${describe(formData.title)}.`);
        }

        if (!Array.isArray(formData.content)) {
            fatal("formData.content", `expected an array of elements, received ${describe(formData.content)}.`);
        } else {
            formData.content.forEach((property, index) => {
                const found = validateProperty(property, `content[${index}]`);
                if (found.some((i) => i.level === "error")) invalid.add(index);
                issues.push(...found);
            });
        }
    }

    const errors = issues.filter((i) => i.level === "error");
    const warnings = issues.filter((i) => i.level === "warning");

    return {
        issues,
        errors,
        warnings,
        fatal: issues.some((i) => i.fatal),
        invalid,
        message: issues.length ? formatReport(formData?.title, issues) : ""
    };
};

/**
 * Logs an error thrown inside a callback (onClick, to...) with context about where it happened.
 * @param {string} where - e.g. `button "Back"`
 * @param {unknown} error
 */
export const logCallbackError = (where, error) => {
    const detail = error instanceof Error ? (error.stack ?? error.message) : String(error);
    console.error(`${PREFIX} Error inside ${where}: ${detail}`);
};
