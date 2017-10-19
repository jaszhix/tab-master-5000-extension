const path = require('path');
const webpack = require('webpack');
const autoprefixer = require('autoprefixer');
const cssnano = require('cssnano');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const LodashModuleReplacementPlugin = require('lodash-webpack-plugin');

const aliases = Object.assign({
  underscore: 'lodash'
}, require('lodash-loader').createLodashAliases());

const publicPath = 'http://127.0.0.1:8009/app/scripts/';
const PROD = process.env.NODE_ENV === 'production';
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
  context: path.resolve(__dirname, 'app/scripts/components'),
  entry: [
    'react-hot-loader/patch',
    'webpack-dev-server/client?http://127.0.0.1:8009',
    'webpack/hot/only-dev-server',
    'app.js',
  ],
  output: {
    path: path.resolve('./scripts/'),
    filename: 'app.js',
    publicPath
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
         NODE_ENV: JSON.stringify(process.env.NODE_ENV)
       }
    }),
    new webpack.NamedModulesPlugin(),
    new webpack.optimize.ModuleConcatenationPlugin(),
  ],
  module: {
    loaders: [
      // we pass the output from babel loader to react-hot loader
      { test: /\.(js|jsx)$/,
        exclude: /node_modules/,
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
      }
    ],
  },
  devtool: 'cheap-module-source-map',
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

if (PROD) {
  config.entry = ['babel-polyfill', config.entry];
  config.devtool = 'hidden-source-map';
  config.plugins.push(
    new webpack.optimize.UglifyJsPlugin({
      mangle: false,
      sourceMap: true,
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
        cascade: true,
        unsafe: false
      },
      output: {
        comments: false
      }
    }),
    new BundleAnalyzerPlugin({
      openAnalyzer: false,
      analyzerMode: 'static',
      reportFilename: 'bundleReport.html'
    }));
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