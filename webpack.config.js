const path = require('path');
const webpack = require('webpack');
const autoprefixer = require('autoprefixer');
const cssnano = require('cssnano');
const ExtractTextPlugin = require('extract-text-webpack-plugin');

const publicPath = 'http://127.0.0.1:8009/app/scripts/';
const PROD = false;
const postcssPlugins = () => {
  let processors = [
    autoprefixer({
      browsers: [
        'ff >= 30',
        'chrome >= 34',
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

module.exports = {
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
    new ExtractTextPlugin({ disable: true }),
    new webpack.NoEmitOnErrorsPlugin(),
    new webpack.HotModuleReplacementPlugin(),
    new webpack.NamedModulesPlugin(),
    new webpack.LoaderOptionsPlugin({
      debug: true,
    })
  ],
  module: {
    loaders: [
      // we pass the output from babel loader to react-hot loader
      { test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: [
          //{loader: 'react-hot'},
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
                includePaths: [
                  path.join(__dirname, 'node_modules')
                ],
                outputStyle: PROD ? 'compressed' : 'expanded'
              }
            }
          ],
        }),
      },
      {
        test: /\.(ttf|eot|svg|woff(2)?)(\S+)?$/,
        loader: 'file-loader?name=[hash].[ext]'
      },
      {
        test: /\.(png|jpg|gif)$/,
        loader: 'file-loader?name=[hash].[ext]'
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
    alias: {
      'underscore': 'lodash'
    }
  },
  devServer: {
    port: 8009,
    hot: true,
    inline: false,
    historyApiFallback: true,
    contentBase: path.join(__dirname, 'dist'),
    headers:    {'Access-Control-Allow-Origin': '*'},
    publicPath
  },
};