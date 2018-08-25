const fs = require('fs');
const path = require('path');
const webpack = require('webpack');
const autoprefixer = require('autoprefixer');
const cssnano = require('cssnano');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const LodashModuleReplacementPlugin = require('lodash-webpack-plugin');

const UglifyJsPlugin = require('uglifyjs-webpack-plugin');
const aliases = Object.assign({
  underscore: 'lodash'
}, require('lodash-loader').createLodashAliases());

const {DEV_ENV, NODE_ENV, BUNDLE_ENTRY} = process.env;
const ENV = NODE_ENV || 'development';
const PROD = ENV === 'production';
const ENTRY = BUNDLE_ENTRY;
const SKIP_MINIFY = JSON.parse(process.env.SKIP_MINIFY || 'false');
const publicPath = PROD ? '/' : 'http://127.0.0.1:8009/app/scripts/';

const CONTENT_BASE = SKIP_MINIFY ? 'sources' : 'dist';
const WORKDIR = PROD ? CONTENT_BASE : 'app';
console.log(`ENTRY:`, ENTRY || 'app');
console.log(`NODE_ENV:`, NODE_ENV);
console.log(`BUILD ENV:`, DEV_ENV);
console.log(`SKIP MINIFICATION:`, SKIP_MINIFY);
console.log(`WORKDIR:`, WORKDIR);
console.log(`========================================`);
fs.createReadStream(`./app/manifest_${DEV_ENV}${DEV_ENV === 'chrome' && ENV === 'development' ? '.dev' : ''}.json`)
  .pipe(fs.createWriteStream(`./${WORKDIR}/manifest.json`));

const postcssPlugins = () => {
  let processors = [
    autoprefixer({
      browsers: [
        'ff >= 52',
        'chrome >= 58',
        'opera >= 23'
      ]
    })
  ];
  processors.push(cssnano({
    safe: true,
    discardComments: {
      removeAll: true
    }
  }));
  return processors;
}

const config = {
  mode: ENV,
  context: path.resolve(__dirname),
  entry: PROD ? [
    'babel-polyfill',
    'app.js'
  ] : [
    'react-hot-loader/patch',
    'webpack-dev-server/client?http://127.0.0.1:8009',
    'webpack/hot/only-dev-server',
    'app.js',
  ],
  output: {
    path: path.resolve(__dirname, `${CONTENT_BASE}/scripts`),
    filename: 'app.js',
    publicPath,
    globalObject: 'this'
  },
  plugins: [
    new LodashModuleReplacementPlugin({
      cloning: true,
      flattening: true,
      shorthands: true
    }),
    new ExtractTextPlugin(PROD ? 'main.css' : { disable: true }),
    new webpack.DefinePlugin({
      'process.env': {
         NODE_ENV: JSON.stringify(NODE_ENV)
       }
    })
  ],
  module: {
    rules: [
      // we pass the output from babel loader to react-hot loader
      { test: /\.(js|jsx)$/,
        exclude: /node_modules(?!\/rc-color-picker)/,
        use: [
          {loader: 'lodash-loader'},
          {loader: 'babel-loader'}
        ],
      },
      {
        test: /\.css$/,
        use: ExtractTextPlugin.extract({
          fallback: 'style-loader',
          use: [
            {
              loader: 'css-loader',
              options: {
                sourceMap: true,
                importLoaders: 1
              }
            },
            {
              loader: 'postcss-loader',
              options: {
                sourceMap: true,
                plugins: postcssPlugins
              }
            },
          ],
        }),
      },
      {
        test: /\.scss$/,
        use: ExtractTextPlugin.extract({
          fallback: 'style-loader',
          use: [
            {
              loader: 'css-loader',
              options: {
                sourceMap: true,
                importLoaders: 1
              },
            },
            {
              loader: 'postcss-loader',
              options: {
                sourceMap: true,
                plugins: postcssPlugins
              }
            },
            {
              loader: 'sass-loader',
              options: {
                sourceMap: true,
                includePaths: [],
                outputStyle: PROD ? 'compressed' : 'expanded'
              }
            }
          ],
        }),
      },
      {
        test: /\.(ttf|eot|svg|woff(2)?)(\S+)?$/,
        loader: 'file-loader?name=[name].[ext]'
      },
      {
        test: /\.(png|jpg|gif)$/,
        loader: 'file-loader?name=[name].[ext]'
      },
      {
        test: require.resolve('trackjs'),
        loader: 'exports-loader?trackJs'
      },
      {
        test: /\.worker\.js$/,
        use: {
          loader: 'worker-loader',
          options: {
            name: PROD ? '[name].js' : '[hash].worker.js',
            publicPath: PROD ? '/scripts/' : publicPath
          }
        }
      }
    ],
  },
  devtool: PROD ? 'source-map' : 'inline-source-map',
  stats: {
    children: false
  },
  resolve: {
    modules: [
      'node_modules',
       path.join(__dirname, 'app/scripts/components')
    ],
    extensions: ['.js', '.jsx'],
    alias: aliases
  },
  devServer: {
    port: 8009,
    hot: true,
    inline: false,
    historyApiFallback: true,
    contentBase: path.join(__dirname, 'dist'),
    headers: {'Access-Control-Allow-Origin': '*'},
    publicPath
  },
};

if (PROD && ENTRY) {
  if (ENTRY === 'app') {
    config.entry = './app/scripts/components/app.js';
    config.output.filename = 'app.js';
  } else if (ENTRY === 'bg') {
    config.entry = './app/scripts/bg/bg.js';
    config.output.filename = 'background.js';
  } else {
    config.entry = './app/scripts/content/content.js';
    config.output.filename = 'content.js';
  }

  config.entry = ['babel-polyfill', config.entry];
  config.devtool = 'hidden-source-map';
  if (!SKIP_MINIFY) {
    config.optimization = {
      minimize: false,
      splitChunks: {
        chunks: 'async',
        minSize: 30000,
        minChunks: 2,
        maxAsyncRequests: 5,
        maxInitialRequests: 3,
        name: true,
        cacheGroups: {
          default: {
            minChunks: 2,
            priority: -20,
            reuseExistingChunk: true,
          },
          vendors: {
            test: /[\\/]node_modules[\\/]/,
            priority: -10,
            chunks: 'all'
          }
        }
      }
    };
    config.plugins.push(
      new UglifyJsPlugin({
        sourceMap: true,
        uglifyOptions: {
          mangle: false,
          compress: {
            warnings: false,
            drop_console: true,
            dead_code: true,
            unused: true,
            booleans: true,
            join_vars: true,
            negate_iife: true,
            sequences: true,
            properties: true,
            evaluate: false,
            loops: true,
            if_return: true,
            unsafe: false
          },
          output: {
            comments: false
          }
        },
      })
    );
  } else {
    config.plugins.push(
      new BundleAnalyzerPlugin({
        openAnalyzer: false,
        analyzerMode: 'static',
        reportFilename: `../bundle_analysis/${ENTRY}_bundleReport.html`
      })
    );
  }
} else {
  config.plugins.push(
    new webpack.NoEmitOnErrorsPlugin(),
    new webpack.HotModuleReplacementPlugin(),
    new webpack.LoaderOptionsPlugin({
      debug: true,
    })
  );
}
module.exports = config;