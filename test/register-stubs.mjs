// Lets Node run the library outside the game:
//  - replaces @minecraft/server-ui with a stub
//  - resolves imports written without extension (the library is meant to be bundled)
import { register } from "node:module";

register("./stub-loader.mjs", import.meta.url);
