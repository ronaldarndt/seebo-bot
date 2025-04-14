import typescript from "@rollup/plugin-typescript";
import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import json from "@rollup/plugin-json";

const config = [
  {
    input: "main.ts",
    output: {
      file: "main.js",
      format: "cjs"
    },
    plugins: [
      resolve({
        mainFields: ["module", "main"]
      }),
      commonjs({ transformMixedEsModules: true }),
      json(),
      typescript({
        compilerOptions: {
          module: "ESNext",
          target: "es2020",
          moduleResolution: "node"
        }
      })
    ]
  }
];
export default config;
