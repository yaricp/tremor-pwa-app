const path = require('path');

const HtmlWebpackPlugin = require('html-webpack-plugin');
const WorkboxPlugin = require('workbox-webpack-plugin');
const CopyPlugin = require("copy-webpack-plugin");

 module.exports = {
   entry: {
     app: './src/app.js',
   },
   output: {
     filename: '[name].bundle.js',
     path: path.resolve(__dirname, 'dist/'),
     clean: true,
   },
   plugins: [
     new HtmlWebpackPlugin({
       title: 'Tremor PWA',
       template: './src/index.html'
     }),
     new CopyPlugin({
      patterns: [
         { from: "assets", to: "static" }
        ],
      }),
//     new WorkboxPlugin.GenerateSW({
//       clientsClaim: true,
//       skipWaiting: true
//     }),
   ],

   module: {
     rules: [
       {
         test: /\.css$/i,
         use: ['style-loader', 'css-loader'],
       }
     ]
   },


 };