

const webpack = require("webpack")
const path = require("path")
const fs = require("fs")
const env = require("yargs").argv.mode
const target = require("yargs").argv.target

const UglifyPlugin = webpack.optimize.UglifyJsPlugin
const CommonsChunkPlugin = webpack.optimize.CommonsChunkPlugin
const DedupePlugin = webpack.optimize.DedupePlugin

const HtmlWebpackPlugin = require("html-webpack-plugin")
const BrowserSyncPlugin = require("browser-sync-webpack-plugin")
const CopyWebpackPlugin = require("copy-webpack-plugin")
const WebpackOnBuildPlugin = require("on-build-webpack")


const nodeModulesDir = path.resolve(__dirname, "../node_modules")

const THIS_APP_ID = "vitals"

const plugins = []
const nodeModules = {}

let outputFile = ".bundle"
let outputPath

let configJson
let appEntryPoint
let localOwaFolder

let devtool

const getConfig = function () {
	  let config

	  try {
	    // look for config file
	    config = require("./config.json")
	  } catch (err) {
	    // create file with defaults if not found
	    config = {
	      LOCAL_OWA_FOLDER: "/home/sebas/openmrs/dev260/owa/",
	      APP_ENTRY_POINT: "http://localhost:9000/openmrs/owa/vitals/index.html",
	    }

	    fs.writeFile("config.json", JSON.stringify(config))
	  } finally {
	    return config
	  }
}
const config = getConfig()

/** Minify for production */
if (env === "production") {
	  plugins.push(new UglifyPlugin({
	    output: {
	      comments: false,
	    },
	    minimize: true,
	    sourceMap: false,
	    compress: {
	        warnings: false,
	    },
	  }))
	  plugins.push(new DedupePlugin())
	  outputFile = `${outputFile}.min.js`
	  outputPath = `${__dirname}/dist/`
	  plugins.push(new WebpackOnBuildPlugin((stats) => {
      // create zip file
    const archiver = require("archiver")
    const output = fs.createWriteStream(`${THIS_APP_ID}.zip`)
    const archive = archiver("zip")

    output.on("close", () => {
			    console.log(`distributable has been zipped! size: ${archive.pointer()}`)
    })

    archive.on("error", (err) => {
			    throw err
    })

    archive.pipe(output)

    archive.directory(`${outputPath}`, "")

    archive.finalize()
		 }))
} else if (env === "deploy") {
	  outputFile = `${outputFile}.js`
	  outputPath = `${config.LOCAL_OWA_FOLDER}${THIS_APP_ID}`
	  devtool = "source-map"
} else if (env === "dev") {
	  outputFile = `${outputFile}.js`
	  outputPath = `${__dirname}/dist/`
	  devtool = "source-map"
}

plugins.push(new BrowserSyncPlugin({
  proxy: {
    	target: config.APP_ENTRY_POINT,
  },
}))

plugins.push(new CommonsChunkPlugin("vendor", "vendor.bundle.js"))

plugins.push(new HtmlWebpackPlugin({
  template: "./app/index.html",
  inject: "body",
}))

plugins.push(new CopyWebpackPlugin([{
  from: "./app/manifest.webapp",
}]))

plugins.push(new CopyWebpackPlugin([{
  from: './app/images/openmrs-with-title-small.png',
    to: 'images/openmrs.png'
}]));


const webpackConfig = {
  quiet: false,
  entry: {
    app: `${__dirname}/app/js/vitals`,
   css: `${__dirname}/app/css/vitals.css`,
    vendor: [
      "react", "react-router",
      "redux", "redux-promise-middleware", "redux-thunk", "react-redux",
    ],
  },
  devtool,
  target,
  output: {
    path: outputPath,
    filename: `[name]${outputFile}`,
  },
  module: {
    loaders: [{
      test: /\.jsx?$/,
      loader: "babel-loader",
      exclude: /node_modules/,
      query: {
        presets: ["es2015", "react"],
        cacheDirectory: true,
      },
    }, {
      test: /\.css$/,
      loader: "style-loader!css-loader",
    }, {
      test: /\.(png|jpg|jpeg|gif|svg)$/,
      loader: "url",
    }, {
      test: /\.html$/,
      loader: "html",
    }],
  },
  resolve: {
    root: path.resolve("./src"),
    extensions: ["", ".js", ".jsx"],
  },
  plugins,
  externals: nodeModules,
}

module.exports = webpackConfig
