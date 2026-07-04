import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist", "node_modules"] },
  js.configs.recommended,
  ...tseslint.configs.strict,
  {
    languageOptions: {
      globals: {
        document: "readonly",
        window: "readonly",
        ResizeObserver: "readonly",
        HTMLCanvasElement: "readonly",
        HTMLElement: "readonly",
        KeyboardEvent: "readonly",
        Event: "readonly",
      },
    },
  },
);
