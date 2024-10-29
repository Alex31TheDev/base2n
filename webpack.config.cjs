const path = require("path");

const CopyWebpackPlugin = require("copy-webpack-plugin");
const TerserPlugin = require("terser-webpack-plugin");

const inProduction = process.env.NODE_ENV == "production",
    distPath = path.resolve(__dirname, "dist");

const filesToCopy = [
    {
        from: "./index.d.ts",
        to: distPath
    },
    {
        from: "./dist.package.json",
        to: path.join(distPath, "package.json")
    },
    {
        from: "./README.md",
        to: distPath
    },
    {
        from: "./LICENSE",
        to: distPath
    }
];

const terserOptions = {
    mangle: {
        properties: {
            regex: /(^_)|(_$)/
        }
    },
    compress: {
        passes: 2
    }
};

module.exports = {
    mode: inProduction ? "production" : "development",
    entry: "./index.js",
    target: "node",
    devtool: "source-map",
    output: {
        path: distPath,
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
            patterns: filesToCopy
        })
    ],
    optimization: {
        minimizer: [
            new TerserPlugin({
                terserOptions,
                extractComments: false
            })
        ]
    }
};
