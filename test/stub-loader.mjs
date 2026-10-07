export async function resolve(specifier, context, nextResolve) {
    if (specifier === "@minecraft/server-ui") {
        return { url: new URL("./stubs/server-ui.js", import.meta.url).href, shortCircuit: true };
    }
    try {
        return await nextResolve(specifier, context);
    } catch (error) {
        if (error.code === "ERR_MODULE_NOT_FOUND" && specifier.startsWith(".")) {
            return nextResolve(`${specifier}.js`, context);
        }
        throw error;
    }
}
