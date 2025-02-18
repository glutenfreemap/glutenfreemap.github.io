FROM jekyll/jekyll AS build

WORKDIR /src

RUN chmod 777 /src

COPY Gemfile .
COPY Gemfile.lock .
RUN bundle install
ENV SKIP_INSTALL_DEPS=true
ENV JEKYLL_ENV=production

COPY . .
RUN rm nginx.conf
RUN jekyll build

FROM nginx:1.21.6-alpine

COPY nginx.conf /etc/nginx/nginx.conf
COPY --from=build /src/_site /usr/share/nginx/html
