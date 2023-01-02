#!/bin/sh

docker run --rm -v ${PWD}:/usr/share/nginx/html -p 8080:80 -it nginx
