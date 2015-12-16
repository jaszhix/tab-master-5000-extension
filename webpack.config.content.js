var webpack = require('webpack');
module.exports = {
  entry: "./app/scripts/content/content.js",
  module: {
    loaders: [{
      test: /\.js$/,
      loader: 'babel'
    }, {
      test: /\.css$/,
      loader: 'style-loader!css-loader'
    }, {
      test: /\.(png|jpg|gif)$/,
      loader: 'file-loader?name=[name].[ext]'
    }],
  },
  output: {
    filename: 'content.js',
  }
};
