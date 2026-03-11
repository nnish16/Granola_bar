const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const MODEL_URL = "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en.bin";
const outDir = path.join(__dirname, "../resources/models");
const outFile = path.join(outDir, "ggml-base.en.bin");

if (!fs.existsSync(outFile)) {
  fs.mkdirSync(outDir, { recursive: true });
  execSync(`curl -L "${MODEL_URL}" -o "${outFile}"`, { stdio: "inherit" });
}
