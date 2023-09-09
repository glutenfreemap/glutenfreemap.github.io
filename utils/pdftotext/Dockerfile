FROM alpine

RUN apk update && apk add --no-cache poppler-utils
ENTRYPOINT ["/usr/bin/pdftotext"]
CMD ["-layout", "-nopgbrk", "-", "-"]
