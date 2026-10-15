import { DataDrivenScreenClosedReason } from "@minecraft/server-ui";
import { customFormRender } from "./customFormRender";

/**
 * @param {Record<string, (player: import("@minecraft/server").Player, params?: Record<string, any>) => import("./customFormRender").FormData>} views
 * @param {import("./customFormRender").RenderOptions} [renderOptions]
 */
export const createRouter = (views, renderOptions) => {
    const stacks = new Map();

    const open = async (player, name, params = {}, push = true) => {
        const build = views[name];
        if (!build) throw new Error(`Unknown View: "${name}"`);

        const form = build(player, params);

        const stack = stacks.get(player.id) ?? [];
        const entry = { name, params };
        if (push) stack.push(entry);
        stacks.set(player.id, stack);

        let navigated = false; // ¿este formulario se cerró porque el router navegó?

        const content = form.content.map((prop) => {
            if (prop.type !== "button" || prop.to === undefined || typeof prop.to === "function") return prop;

            if (prop.to === "back") {
                return {
                    ...prop,
                    to: () => {
                        navigated = true;
                        stack.pop();
                        const prev = stack[stack.length - 1];
                        if (prev) open(player, prev.name, prev.params, false);
                        else stacks.delete(player.id); // no hay a dónde volver
                    }
                };
            }

            const target = typeof prop.to === "string" ? { view: prop.to, params: {} } : prop.to;
            return {
                ...prop,
                to: () => {
                    navigated = true;
                    open(player, target.view, target.params);
                }
            };
        });

        return Promise.resolve(customFormRender(player, { ...form, content }, renderOptions)).then((reason) => {
            // Si otra apertura ya reemplazó la pila, no tocar nada
            if (stacks.get(player.id) !== stack) return reason;

            if (
                reason === DataDrivenScreenClosedReason.ClientClosed ||
                (reason === DataDrivenScreenClosedReason.ServerClosed && !navigated)
            ) {
                stacks.delete(player.id); // cerró el jugador, o se cerró por código
            } else if (push && (reason === undefined || reason === DataDrivenScreenClosedReason.UserBusy)) {
                const i = stack.lastIndexOf(entry);
                if (i !== -1) stack.splice(i, 1); // nunca se mostró
            }
            return reason;
        });
    };

    return {
        open: (player, name, params) => {
            stacks.delete(player.id); // una apertura raíz siempre empieza limpia
            return open(player, name, params);
        },
        clear: (playerId) => stacks.delete(playerId), // opcional, para quien lo quiera
    };
};