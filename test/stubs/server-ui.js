// Minimal stand-in for the game's @minecraft/server-ui, only for running the tests with Node.
class Observable {
    constructor(data, options) { this.data = data; this.options = options; }
    getData() { return this.data; }
}
export class ObservableString extends Observable { }
export class ObservableNumber extends Observable { }
export class ObservableBoolean extends Observable { }
export class ObservableUIRawMessage extends Observable { }

export const DataDrivenScreenClosedReason = { ClientClosed: "ClientClosed", ServerClosed: "ServerClosed", UserBusy: "UserBusy" };

export class CustomForm {
    static last = null;
    /** What show() resolves with right away. Set to null to keep the form open until close() or finish(). */
    static autoClose = "ClientClosed";
    constructor(player, title) {
        this.player = player;
        this.title = title;
        this.calls = [];
        this.showing = false;
        CustomForm.last = this;
    }
    record(name, args) { this.calls.push({ name, args }); return this; }
    button(...a) { return this.record("button", a); }
    closeButton(...a) { return this.record("closeButton", a); }
    divider(...a) { return this.record("divider", a); }
    dropdown(...a) { return this.record("dropdown", a); }
    header(...a) { return this.record("header", a); }
    image(...a) { return this.record("image", a); }
    label(...a) { return this.record("label", a); }
    slider(...a) { return this.record("slider", a); }
    spacer(...a) { return this.record("spacer", a); }
    textField(...a) { return this.record("textField", a); }
    toggle(...a) { return this.record("toggle", a); }
    isShowing() { return this.showing; }
    close() { this.finish("ServerClosed"); }
    finish(reason) { this.showing = false; this.resolve?.(reason); this.resolve = null; }
    show() {
        this.showing = true;
        return new Promise((resolve) => {
            this.resolve = resolve;
            if (CustomForm.autoClose) this.finish(CustomForm.autoClose);
        });
    }
}
