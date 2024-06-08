import fs from 'fs-extra';
import {execSync} from 'child_process';
import path from 'path';
import webpack from 'webpack';
import autoprefixer from 'autoprefixer';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import {BundleAnalyzerPlugin} from 'webpack-bundle-analyzer';
import TerserPlugin from 'terser-webpack-plugin';

const babelConfig = JSON.parse(fs.readFileSync('./.babelrc').toString());

const aliases = Object.assign({
  underscore: 'lodash',
}, require('lodash-loader').createLodashAliases());

type EnvMode = 'development' | 'production';

let {COMMIT_HASH, DEV_ENV, NODE_ENV, BUNDLE_ENTRY} = process.env;
const ENV: EnvMode = <EnvMode>NODE_ENV || 'development';
const PROD = ENV === 'production';
const ENTRY = BUNDLE_ENTRY;
const SKIP_MINIFY = JSON.parse(process.env.SKIP_MINIFY || PROD ? 'false' : 'true');
const publicPath = '/build/';

const CONTENT_BASE = SKIP_MINIFY ? 'app' : 'dist';
const WORKDIR = PROD ? CONTENT_BASE : 'app';
const manifestPath = `./${WORKDIR}/manifest.json`;

if (!COMMIT_HASH) {
  try {
    COMMIT_HASH = execSync(`git log --pretty=format:%h -n 1 -v ${__dirname}`).toString();
  } catch (e) {
    COMMIT_HASH = '<unknown>';
  }
}

console.log(`COMMIT HASH:`, COMMIT_HASH);
console.log(`ENTRY:`, ENTRY || 'bg');
console.log(`NODE_ENV:`, NODE_ENV);
console.log(`BUILD ENV:`, DEV_ENV);
console.log(`SKIP MINIFICATION:`, SKIP_MINIFY);
console.log(`WORKDIR:`, WORKDIR);
console.log(`========================================`);

fs.ensureFileSync(manifestPath);
fs.createReadStream(`./app/manifest_${DEV_ENV}${DEV_ENV === 'chrome' && ENV === 'development' ? '.dev' : ''}.json`)
  .pipe(fs.createWriteStream(manifestPath));

const postcssPlugins = () => {
  let processors = [
    autoprefixer({
      overrideBrowserslist: [
        'ff >= 52',
        'chrome >= 58',
        'opera >= 23'
      ]
    })
  ];

  return processors;
}

let cssLoaders: webpack.RuleSetUse[] = [
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
      postcssOptions: {
        plugins: postcssPlugins
      },
    }
  },
];

let scssLoaders: webpack.RuleSetUse[] = [
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
      postcssOptions: {
        plugins: postcssPlugins
      }
    }
  },
  {
    loader: 'sass-loader',
    options: {
      sourceMap: true,
      sassOptions: {
        outputStyle: PROD ? 'compressed' : 'expanded',
        includePaths: [
          path.join(__dirname, 'node_modules')
        ],
      }
    }
  }
];

if (!PROD) {
  cssLoaders = [<webpack.RuleSetUse>'style-loader'].concat(cssLoaders);
  scssLoaders = [<webpack.RuleSetUse>'style-loader'].concat(scssLoaders);
}

const config: webpack.Configuration = {
  mode: ENV,
  context: path.resolve(__dirname),
  entry: PROD ? [
    '@babel/polyfill',
    'index.tsx'
  ] : [
    'webpack/hot/dev-server',
    'webpack-dev-server/client?hot=true&hostname=localhost&port=8009',
    'index.tsx',
  ],
  output: {
    path: path.resolve(__dirname, `${CONTENT_BASE}/build`),
    filename: 'app.js',
    publicPath,
    globalObject: 'this',
    pathinfo: !PROD,
  },
  plugins: [
    new webpack.IgnorePlugin({
      resourceRegExp: /^\.\/locale$/,
      contextRegExp: /moment$/
    }),
    new webpack.DefinePlugin({
      'process.env': {
         NODE_ENV: JSON.stringify(NODE_ENV)
       }
    }),
    new MiniCssExtractPlugin({
      filename: PROD ? '[name].[contenthash].css' : '[name].css',
      chunkFilename: PROD ? '[id].[contenthash].css' : '[id].css',
    }),
  ],
  optimization: {
    splitChunks: {
      chunks: 'async',
      minSize: 30000,
      minChunks: 2,
      maxAsyncRequests: 5,
      maxInitialRequests: 3,
      name(module, chunks, cacheGroupKey) {
        // Custom naming logic
        return `${cacheGroupKey}-${chunks.map(chunk => chunk.name).join('~')}`;
      },
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
        },
      }
    }
  },
  module: {
    rules: [
      {
        test: /\.(js|ts|tsx)$/,
        use: ['source-map-loader'],
        enforce: 'pre',
      },
      {
        test: /\.worker\.ts$/,
        enforce: 'post',
        use: {
          loader: 'worker-loader',
          options: {
            filename: '[name].js',
            publicPath,
          },
        },
      },
      {
        test: /\.(ts|tsx)$/,
        exclude: /node_modules(?!\/rc-color-picker)/,
        enforce: 'post',
        use: [
          {
            loader: 'lodash-loader',
          },
          {
            loader: 'babel-loader',
            options: babelConfig,
          },
          {
            loader: 'ts-loader',
            options: {
              compilerOptions: {
                // Preserve code splitting
                module: 'esnext',
              },
            },
          },
        ],
      },
      {
        test: /\.(js|jsx|mjs)$/,
        exclude: /node_modules(?!\/rc-color-picker)/,
        enforce: 'post',
        use: [
          {
            loader: 'lodash-loader',
          },
          {
            loader: 'babel-loader',
            options: babelConfig,
          },
        ],
      },
      {
        test: /\.css$/,
        use: [
          PROD ? MiniCssExtractPlugin.loader : 'style-loader',
          'css-loader',
        ],
      },
      {
        test: /\.scss$/,
        use: [
          PROD ? MiniCssExtractPlugin.loader : 'style-loader',
          'css-loader',
          'sass-loader',
        ],
      },
      {
        test: /\.(ttf|eot|svg|woff(2)?)(\S+)?$/,
        type: 'asset/resource',
        generator: {
          filename: '[name][ext]',
        },
      },
      {
        test: /\.(png|jpg|gif)$/,
        type: 'asset/resource',
        generator: {
          filename: '[name][ext]',
        },
      },
    ],
  },
  devtool: PROD ? 'hidden-source-map' : 'inline-cheap-module-source-map',
  stats: {
    children: false
  },
  resolve: {
    modules: [
      'node_modules',
       path.join(__dirname, 'app/scripts/components')
    ],
    extensions: ['.js', '.jsx', '.tsx', '.ts', '.json'],
    alias: aliases,
    fallback: {
      "crypto": false,
      "stream": false,
      "assert": false,
      "http": false,
      "https": false,
      "os": false,
      "url": false,
    }
  },
};

if (PROD && ENTRY) {
  if (ENTRY === 'app') {
    config.entry = './app/scripts/components/index.tsx';
    config.output.filename = 'app.js';
  } else if (ENTRY === 'bg') {
    config.entry = './app/scripts/bg/bg.ts';
    config.output.filename = 'background.js';
  } else {
    throw new Error('Invalid entrypoint.');
  }

  config.entry = ['@babel/polyfill', config.entry];

  config.plugins.push(
    new BundleAnalyzerPlugin({
      openAnalyzer: false,
      analyzerMode: 'static',
      reportFilename: `../bundleReports/${ENTRY}-${COMMIT_HASH}-bundleReport.html`,
    }),
  );

  if (!SKIP_MINIFY) {
    Object.assign(config.optimization, {
      minimize: true,
      minimizer: [
        new TerserPlugin({
          parallel: true,
          terserOptions: {
            ecma: undefined,
            parse: {},
            compress: {
              drop_console: true,
              drop_debugger: true,
            },
            sourceMap: true,
            mangle: false,
            module: false,
            toplevel: false,
            ie8: false,
            keep_classnames: true,
            keep_fnames: true,
            safari10: false
          },
        }),
      ],
    });
  }
} else {
  Object.assign(config.optimization, {
    chunkIds: 'named',
    moduleIds: 'named',
    flagIncludedChunks: false,
    concatenateModules: false,
    emitOnErrors: false,
    checkWasmTypes: false,
    minimize: false,
    removeAvailableModules: false
  });

  config.plugins.push(
    new webpack.HotModuleReplacementPlugin(),
    new webpack.LoaderOptionsPlugin({
      debug: true,
    }),
  );
}

export default config;
