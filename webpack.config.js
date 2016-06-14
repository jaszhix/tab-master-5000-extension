var path = require('path');
var webpack = require('webpack');
var autoprefixer = require('autoprefixer');

var scssIncludePaths = [
  path.join(__dirname, './node_modules')
];

var autoprefixerOptions = {
  browsers: [
    'chrome >= 34',
  ]
};

module.exports = {
  context: __dirname,
  entry: [
    'webpack-dev-server/client?http://127.0.0.1:8009',
    'webpack/hot/only-dev-server',
    './app/scripts/components/root.js'
  ],
  output: {
    path: path.resolve('./app/scripts/'),
    filename: "app.js",
    //chunkFilename: "[chunkhash].js",
    publicPath: 'http://127.0.0.1:8009/app/scripts/'
  },
  plugins: [
    new webpack.HotModuleReplacementPlugin(),
  ],
  postcss: function () {
    return [autoprefixer(autoprefixerOptions)];
  },
  module: {
    loaders: [
      // we pass the output from babel loader to react-hot loader
      { test: /\.(js|jsx)$/, 
        exclude: /node_modules/, 
        loaders: [
          'react-hot', 
          'babel'
        ],
      },
      {
        test: /\.css$/,
        loader: 'style-loader!css-loader'
      },
      {
        test: /\.scss$/,
        loader: 'style-loader!css-loader!autoprefixer-loader?' + JSON.stringify(autoprefixerOptions) + '!sass-loader?outputStyle=compressed&sourceComments=false&' + scssIncludePaths.join('&includePaths[]=')
      },
      {
        test: /\.(ttf|eot|svg|woff(2)?)(\S+)?$/,
        loader: 'file-loader?name=[hash].[ext]'
      },
      {
        test: /\.(png|jpg|gif)$/,
        loader: 'file-loader?name=[hash].[ext]'
      }
    ],
  },

  resolve: {
    root:  path.resolve(__dirname, '.'),
    modulesDirectories: ['node_modules', 'bower_components'],
    extensions: ['', '.js', '.jsx'],
    alias: {
      'underscore': 'lodash'
    }
  },
};