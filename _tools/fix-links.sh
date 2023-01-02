#!/bin/sh
# Add this as a pre-commit hook to ensure that the URLs change when the CSS or JS files change.

CSS_HASH=`md5sum main.css | cut -d " " -f 1`
sed -i "s/main\.css[?]v=[[:alnum:]]*/main.css?v=$CSS_HASH/g" index.html

JS_HASH=`md5sum main.js | cut -d " " -f 1`
sed -i "s/main\.js[?]v=[[:alnum:]]*/main.js?v=$JS_HASH/g" index.html

git add index.html
