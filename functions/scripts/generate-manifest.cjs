const {spawnSync} = require("node:child_process");
const path = require("node:path");

const functionsDir = path.resolve(__dirname, "..");
const outputPath = path.join(functionsDir, "functions.yaml");
const cliPath = path.join(functionsDir, "node_modules", "firebase-functions", "lib", "bin", "firebase-functions.js");

const result = spawnSync(process.execPath, [cliPath, functionsDir], {
  cwd: functionsDir,
  env: {
    ...process.env,
    FUNCTIONS_MANIFEST_OUTPUT_PATH: outputPath,
  },
  stdio: "inherit",
});

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}