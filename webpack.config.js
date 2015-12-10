var webpack = require('webpack');
module.exports = {
  entry: "./app/scripts/components/root.js",
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
    filename: 'app.js',
  }
};
