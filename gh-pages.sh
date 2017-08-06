#!/bin/bash

set -e

GH_DIR=.gh-pages
JS_URL=assets/js
QR_LIB=examples/qrcode.min.js
MAIN_LIB=dist/bech32-buffer.min.js

# Cleanup
echo "Cleaning up $GH_DIR..."
rm -rf "$GH_DIR"

# Create target directories
mkdir -p "$GH_DIR"
mkdir -p "$GH_DIR/$JS_URL"

# Copy the HTML page
echo "Copying HTML..."
cp examples/demo.html "$GH_DIR/index.html"

# Copy `qrcode` library
echo "Copying libraries..."
[ -e "$QR_LIB" ] || npm run minify-qr
cp "$QR_LIB" "$GH_DIR/$JS_URL"

# Copy the browser version of this library
[ -e "$MAIN_LIB" ] || npm run browser
cp "$MAIN_LIB" "$GH_DIR/$JS_URL"

echo "Editing HTML..."
FNAME=`basename "$MAIN_LIB"`
sed -r -i -e "s:(href|src)=\"../$MAIN_LIB\":\1=\"./$JS_URL/$FNAME\":" "$GH_DIR/index.html"

FNAME=`basename "$QR_LIB"`
sed -r -i -e "s:src=\"$FNAME\":src=\"./$JS_URL/$FNAME\":" "$GH_DIR/index.html"

if [[ "x$1" == "xdeploy" ]]; then
  echo "Deploying to local gh-pages..."
  cd "$GH_DIR"
  git init && \
    git add . && \
    git commit -m "Deploy to GitHub Pages" && \
    git push --force --quiet "../.git" master:gh-pages && \
    rm -rf .git
  cd ..
fi
