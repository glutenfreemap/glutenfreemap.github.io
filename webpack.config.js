const path = require('path');

module.exports = {
    entry: './site/assets/js/main.js',
    output: {
        filename: 'map.js',
        path: path.resolve(__dirname, './site/assets/js'),
    },
};