import { defineWorkspace } from "vitest/config";
export default defineWorkspace([{ test: { include: ["{apps,packages}/**/*.{test,spec}.ts?(x)"] } }]);
