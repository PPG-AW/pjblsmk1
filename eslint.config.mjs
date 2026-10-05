import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

/** Konfigurasi ESLint (flat config) memakai preset Next.js. */
const config = [
  {
    ignores: [".next/**", "node_modules/**", "drizzle/**", "next-env.d.ts"],
  },
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
];

export default config;
