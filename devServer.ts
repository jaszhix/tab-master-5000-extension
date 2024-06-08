process.env.BABEL_ENV = 'development';
process.env.NODE_ENV = 'development';
process.env.ASSET_PATH = '/';

import path from 'path';
import WebpackDevServer from 'webpack-dev-server';
import webpack from 'webpack';
import config from './webpack.config';

const compiler = webpack(config);

const server = new WebpackDevServer(
  {
    hot: true,
    liveReload: false,
    client: {
      webSocketTransport: 'sockjs',
    },
    webSocketServer: 'sockjs',
    host: 'localhost',
    port: 8009,
    static: {
      directory: path.join(__dirname, './dist'),
    },
    devMiddleware: {
      publicPath: `http://localhost:8009/`,
      writeToDisk: true,
    },
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
    allowedHosts: 'all',
  },
  compiler
);

(async () => {
  await server.start();
})();
