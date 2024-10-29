const path = require("path");

const CopyWebpackPlugin = require("copy-webpack-plugin");
const TerserPlugin = require("terser-webpack-plugin");

const inProduction = process.env.NODE_ENV == "production";

module.exports = {
    mode: inProduction ? "production" : "development",
    entry: "./index.js",
    target: "node",
    devtool: "source-map",
    output: {
        path: path.join(__dirname, "dist"),
        filename: "index.js",
        library: "base2n",
        libraryTarget: "umd"
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                use: ["babel-loader"]
            }
        ]
    },
    plugins: [
        new CopyWebpackPlugin({
            patterns: [
                {
                    from: "./index.d.ts",
                    to: path.resolve(__dirname, "dist")
                },
                {
                    from: "./dist.package.json",
                    to: path.resolve(__dirname, "dist", "package.json")
                },
                {
                    from: "./README.md",
                    to: path.resolve(__dirname, "dist")
                },
                {
                    from: "./LICENSE",
                    to: path.resolve(__dirname, "dist")
                }
            ]
        })
    ],
    optimization: {
        minimizer: [
            new TerserPlugin({
                terserOptions: {
                    mangle: {
                        properties: {
                            regex: /(^_)|(_$)/
                        }
                    },
                    compress: {
                        passes: 2
                    }
                }
            })
        ]
    }
};
