#!/bin/sh
# Add this as a pre-commit hook to ensure that the URLs change when the CSS or JS files change.

HASH=`md5sum main.css | cut -d " " -f 1`
sed -i "s/main\.css[?]v=[[:alnum:]]*/main.css?v=$HASH/g" index.html

HASH=`md5sum main.js | cut -d " " -f 1`
sed -i "s/main\.js[?]v=[[:alnum:]]*/main.js?v=$HASH/g" index.html

HASH=`md5sum data.json | cut -d " " -f 1`
sed -i "s/data\.json[?]v=[[:alnum:]]*/data.json?v=$HASH/g" index.html

git add index.html
