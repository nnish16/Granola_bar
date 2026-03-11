/** @type {import('webpack').Configuration} */
module.exports = {
  entry: {
    index: "./electron/main.ts",
    "db-worker": "./electron/db/worker.ts",
    "transcription-worker": "./electron/audio/transcription.worker.ts",
  },
  target: "electron-main",
  devtool: "inline-source-map",
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        exclude: /node_modules/,
        use: {
          loader: "ts-loader",
          options: {
            configFile: "tsconfig.main.json",
            transpileOnly: false,
          },
        },
      },
    ],
  },
  resolve: {
    extensions: [".ts", ".tsx", ".js", ".json"],
  },
  output: {
    filename: "[name].js",
  },
  externals: {
    "better-sqlite3": "commonjs better-sqlite3",
  },
};
