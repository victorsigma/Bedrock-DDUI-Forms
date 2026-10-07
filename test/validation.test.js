import { test } from "node:test";
import assert from "node:assert/strict";
import { CustomForm, ObservableBoolean, ObservableNumber, ObservableString } from "@minecraft/server-ui";
import { customFormRender } from "../src/core/customFormRender.js";
import { FormValidationError, validateForm } from "../src/core/validation.js";

const player = { name: "Steve" };
const num = (n = 0) => new ObservableNumber(n, { clientWritable: true });
const str = (s = "") => new ObservableString(s, { clientWritable: true });
const bool = (b = false) => new ObservableBoolean(b, { clientWritable: true });

const view = (...content) => ({ title: "Test", content });
const only = (report, level) => report.issues.filter((i) => i.level === level);

/** Runs `fn` while capturing console.error / console.warn. */
const capture = async (fn) => {
    const logs = { error: [], warn: [] };
    const original = { error: console.error, warn: console.warn };
    console.error = (...a) => logs.error.push(a.join(" "));
    console.warn = (...a) => logs.warn.push(a.join(" "));
    try {
        return { result: await fn(), logs };
    } finally {
        console.error = original.error;
        console.warn = original.warn;
    }
};

test("a correct view has no issues", () => {
    const report = validateForm(view(
        { type: "header", text: "Title" },
        { type: "spacer" },
        { type: "text-field", label: "Name", text: str("a") },
        { type: "toggle", label: "On", toggled: bool(true) },
        { type: "slider", label: "Range", value: num(5), min: 0, max: 10, options: { step: 1 } },
        { type: "dropdown", label: "Mode", value: num(1), items: [{ label: "A", value: 0 }, { label: "B", value: 1 }] },
        { type: "button", label: "Go", to: () => { } },
        { type: "image", src: "textures/a.png", pack: "textures", options: { width: 0.5, onClick: () => { } } },
        { type: "close-button" }
    ), player);

    assert.equal(report.issues.length, 0);
    assert.equal(report.message, "");
});

test("a missing required property is reported with its path", () => {
    const report = validateForm(view({ type: "label", text: "ok" }, { type: "slider", value: num(), min: 0, max: 10 }), player);

    assert.equal(report.errors.length, 1);
    assert.match(report.errors[0].path, /^content\[1\] slider/);
    assert.equal(report.errors[0].field, "label");
    assert.match(report.errors[0].message, /is required/);
    assert.deepEqual([...report.invalid], [1]);
});

test("a typo in the type suggests the right one", () => {
    for (const typo of ["textfield", "textField", "text_field", "closebutton"]) {
        const report = validateForm(view({ type: typo }), player);
        assert.match(report.errors[0].message, /Did you mean "(text-field|close-button)"\?/, typo);
    }
});

test("an unknown type with nothing similar lists the valid ones", () => {
    const report = validateForm(view({ type: "carousel" }), player);
    assert.match(report.errors[0].message, /Valid types: .*button/);
});

test("an element without type is reported", () => {
    const report = validateForm(view({ text: "hi" }), player);
    assert.equal(report.errors[0].field, "type");
});

test("a plain value instead of an Observable explains how to create it", () => {
    const report = validateForm(view({ type: "toggle", label: "On", toggled: true }), player);
    assert.match(report.errors[0].message, /expected ObservableBoolean, received boolean true/);
    assert.match(report.errors[0].message, /new ObservableBoolean\(<initial value>, \{ clientWritable: true \}\)/);
});

test("`to: openMenu(player)` (calling instead of passing) is caught with a hint", () => {
    const openMenu = () => undefined;
    const report = validateForm(view({ type: "button", label: "Back", to: openMenu(player) }), player);

    assert.equal(report.errors.length, 1);
    assert.equal(report.errors[0].field, "to");
    assert.match(report.errors[0].message, /received undefined/);
    assert.match(report.errors[0].message, /do not call it/);
});

test("`to` receiving a Promise is caught too", () => {
    const report = validateForm(view({ type: "button", label: "Back", to: Promise.resolve() }), player);
    assert.match(report.errors[0].message, /received Promise/);
});

test("an unknown option is a warning with a suggestion (steps -> step)", () => {
    const report = validateForm(view({ type: "slider", label: "S", value: num(), min: 0, max: 10, options: { steps: 5 } }), player);

    assert.equal(report.errors.length, 0);
    assert.equal(only(report, "warning").length, 1);
    assert.equal(report.warnings[0].field, "options.steps");
    assert.match(report.warnings[0].message, /Did you mean "step"\?/);
});

test("an unknown property lists the valid ones when nothing is similar (slider with text)", () => {
    const report = validateForm(view({ type: "slider", text: "S", value: num(), min: 0, max: 10 }), player);

    assert.ok(report.errors.some((i) => i.field === "label"));
    const unknown = report.warnings.find((i) => i.field === "text");
    assert.match(unknown.message, /unknown property "text"\. Valid properties: label, value, min, max, options/);
});

test("options must be an object, and option values are checked", () => {
    const a = validateForm(view({ type: "divider", options: "yes" }), player);
    assert.match(a.errors[0].message, /expected an object, received string "yes"/);

    const b = validateForm(view({ type: "button", label: "x", onClick() { }, options: { visible: "yes" } }), player);
    assert.equal(b.errors[0].field, "options.visible");
});

test("dropdown: bad items are located by index", () => {
    const report = validateForm(view({
        type: "dropdown", label: "D", value: num(0),
        items: [{ label: "A", value: 0 }, { label: "B", value: "1" }, "C"]
    }), player);

    const fields = report.errors.map((i) => i.field);
    assert.deepEqual(fields, ["items[1].value", "items[2]"]);
});

test("dropdown: selected value that no item has is a warning", () => {
    const report = validateForm(view({
        type: "dropdown", label: "D", value: num(7), items: [{ label: "A", value: 0 }, { label: "B", value: 1 }]
    }), player);

    assert.equal(report.errors.length, 0);
    assert.match(report.warnings[0].message, /holds 7, but no item has that value/);
});

test("slider: min >= max and a value outside the range are warnings", () => {
    const a = validateForm(view({ type: "slider", label: "S", value: num(), min: 10, max: 5 }), player);
    assert.match(a.warnings[0].message, /min \(10\) should be lower than max \(5\)/);

    const b = validateForm(view({ type: "slider", label: "S", value: num(50), min: 0, max: 10 }), player);
    assert.match(b.warnings[0].message, /outside the range 0 to 10/);
});

test("a button with no action is a warning, not an error", () => {
    const report = validateForm(view({ type: "button", label: "Nothing" }), player);
    assert.equal(report.errors.length, 0);
    assert.match(report.warnings[0].message, /neither onClick nor to/);
});

test("form level problems are fatal", () => {
    assert.ok(validateForm(undefined, player).fatal);
    assert.ok(validateForm({ title: "x" }, player).fatal);
    assert.ok(validateForm({ title: 5, content: [] }, player).fatal);
    assert.ok(validateForm({ title: "x", content: [] }).fatal, "missing player");
    assert.match(validateForm({ title: "x", content: {} }, player).message, /expected an array of elements, received object/);
});

test("the report message is readable", () => {
    const { message } = validateForm({
        title: "Stored Inventory",
        content: [{ type: "slider", text: "Duration", value: num(5), min: 1, max: 30 }]
    }, player);

    assert.match(message, /^\[bedrock-ddui-forms\] View "Stored Inventory": 1 error, 1 warning/);
    assert.match(message, /ERROR   content\[0\] slider "Duration" > label: is required/);
    assert.match(message, /WARNING content\[0\] slider "Duration" > text: unknown property "text"/);
});

// ---------------- rendering ----------------

test("customFormRender builds the valid elements and replaces the invalid one with a label", async () => {
    const { logs } = await capture(() => customFormRender(player, view(
        { type: "header", text: "Hi" },
        { type: "slider", value: num(), min: 0, max: 10 },
        { type: "divider" }
    )));

    const names = CustomForm.last.calls.map((c) => c.name);
    assert.deepEqual(names, ["header", "label", "divider"]);
    assert.match(CustomForm.last.calls[1].args[0], /\[invalid element\] content\[1\] slider/);
    assert.equal(logs.error.length, 1);
    assert.match(logs.error[0], /content\[1\] slider > label: is required/);
});

test('onInvalid: "skip" leaves the invalid element out', async () => {
    await capture(() => customFormRender(player, view(
        { type: "header", text: "Hi" },
        { type: "nope" },
        { type: "divider" }
    ), { onInvalid: "skip" }));

    assert.deepEqual(CustomForm.last.calls.map((c) => c.name), ["header", "divider"]);
});

test('onInvalid: "throw" throws a FormValidationError and does not open the form', async () => {
    CustomForm.last = null;
    let error;
    await capture(async () => {
        try {
            await customFormRender(player, view({ type: "nope" }), { onInvalid: "throw" });
        } catch (e) {
            error = e;
        }
    });

    assert.ok(error instanceof FormValidationError);
    assert.equal(error.issues.length, 1);
    assert.equal(CustomForm.last, null);
});

test("warnings alone are logged with console.warn and the form still opens", async () => {
    const { logs, result } = await capture(() => customFormRender(player, view(
        { type: "button", label: "Nothing" }
    )));

    assert.equal(logs.error.length, 0);
    assert.equal(logs.warn.length, 1);
    assert.equal(result, "ClientClosed");
    assert.deepEqual(CustomForm.last.calls.map((c) => c.name), ["button"]);
});

test("a fatal problem logs the report and returns undefined without opening the form", async () => {
    CustomForm.last = null;
    const { logs, result } = await capture(() => customFormRender(player, { title: "x", content: "nope" }));

    assert.equal(result, undefined);
    assert.equal(CustomForm.last, null);
    assert.match(logs.error[0], /formData\.content: expected an array of elements, received string "nope"/);
});

test("an error thrown inside onClick is logged with context and does not escape", async () => {
    await capture(() => customFormRender(player, view({
        type: "button", label: "Boom", onClick() { throw new Error("kaboom"); }
    })));

    const handler = CustomForm.last.calls[0].args[1];
    const { logs } = await capture(() => handler());

    assert.equal(logs.error.length, 1);
    assert.match(logs.error[0], /Error inside button "Boom": .*kaboom/s);
});

test("`to` runs after onClick and closes the form first", async () => {
    const order = [];
    await capture(() => customFormRender(player, view({
        type: "button", label: "Go",
        onClick() { order.push("onClick"); },
        to: () => order.push(`to (showing: ${CustomForm.last.isShowing()})`)
    })));

    CustomForm.last.showing = true;
    CustomForm.last.calls[0].args[1]();
    assert.deepEqual(order, ["onClick", "to (showing: false)"]);
});

// ---------------- onExit ----------------

test("onExit runs after the form closes, bound to the form and receiving the reason", async () => {
    let seen;
    await capture(() => customFormRender(player, {
        ...view({ type: "label", text: "Hi" }),
        onExit(reason) { seen = { self: this, reason }; }
    }));

    assert.equal(seen.self, CustomForm.last);
    assert.equal(seen.reason, "ClientClosed");
});

test("onExit does not run when the player was busy (UserBusy)", async () => {
    CustomForm.autoClose = "UserBusy";
    try {
        let called = false;
        const { logs, result } = await capture(() => customFormRender(player, {
            ...view({ type: "label", text: "Hi" }),
            onExit() { called = true; }
        }));

        assert.equal(called, false);
        assert.equal(result, "UserBusy");
        assert.match(logs.warn[0], /ocupado/);
    } finally {
        CustomForm.autoClose = "ClientClosed";
    }
});

test("navigating with `to` closes the form from the server: onExit gets ServerClosed, after `to` ran", async () => {
    CustomForm.autoClose = null;
    try {
        const events = [];
        const pending = customFormRender(player, {
            title: "A",
            content: [{ type: "button", label: "Next", onClick() { events.push("onClick"); }, to: () => events.push("to") }],
            onExit(reason) { events.push(`onExit:${reason}`); }
        });

        CustomForm.last.calls[0].args[1]();   // press the button
        const reason = await pending;

        assert.deepEqual(events, ["onClick", "to", "onExit:ServerClosed"]);
        assert.equal(reason, "ServerClosed");
    } finally {
        CustomForm.autoClose = "ClientClosed";
    }
});

test("an error inside onExit is reported as onExit and the reason is still returned", async () => {
    const { logs, result } = await capture(() => customFormRender(player, {
        ...view({ type: "label", text: "Hi" }),
        onExit() { throw new Error("exit failed"); }
    }));

    assert.equal(result, "ClientClosed");
    assert.match(logs.error[0], /Error inside onExit: .*exit failed/s);
});

test("onExit must be a function, and unknown form keys are reported", () => {
    const a = validateForm({ ...view({ type: "divider" }), onExit: "later" }, player);
    assert.equal(a.errors[0].path, "formData");
    assert.equal(a.errors[0].field, "onExit");
    assert.equal(a.fatal, false);

    const b = validateForm({ ...view({ type: "divider" }), onClose() { } }, player);
    assert.match(b.warnings[0].message, /unknown property "onClose"\. Valid properties: title, content, onExit/);
});

test("a non-function onExit is ignored when rendering", async () => {
    const { result } = await capture(() => customFormRender(player, { ...view({ type: "divider" }), onExit: "later" }));
    assert.equal(result, "ClientClosed");
});
