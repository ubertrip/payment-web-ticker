const path = require('path');
const webpack = require('webpack');
const CopyWebpackPlugin = require('copy-webpack-plugin');

const sourcePath =  './src';

const wpConfig = {
  mode: 'development',
  entry: {
    //'app': [`${sourcePath}/app.js`],
    'content': `${sourcePath}/content.js`,
    'background': `${sourcePath}/background.js`,
    //vendors: ['vue', 'vue-material'],
  },
  output: {
    path: __dirname + '/dist',
    filename: '[name].build.js',
  },

  resolve: {
    extensions: ['.js'],
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /(node_modules|bower_components)/,
        use: {
          loader: 'babel-loader',
          options: {
            //presets: ['@babel/preset-env']
          }
        }
      }
    ]
  },
  plugins: [
    new CopyWebpackPlugin([
      {from: 'index.html', to: 'index.html'},
      {from: 'manifest.json', to: 'manifest.json'},
    ]),
    new webpack.EnvironmentPlugin({
      TICKER_ENV: process.env.TICKER_ENV || 'dev',
    }),
  ],
};

module.exports = wpConfig;
