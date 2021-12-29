const path = require('path');

const HtmlWebpackPlugin = require('html-webpack-plugin');
const WorkboxPlugin = require('workbox-webpack-plugin');

 module.exports = {
   entry: {
     app: './src/app.js',
   },

   plugins: [
     new HtmlWebpackPlugin({
       title: 'Tremor PWA',
       template: './src/index.html'
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
       },
      {
        test: /\.(png|svg|jpg|jpeg|gif)$/i,
        type: 'asset/resource',
      },
     ],
   },

   output: {
     filename: '[name].bundle.js',
     path: path.resolve(__dirname, 'dist'),
     clean: true,
   },
 };