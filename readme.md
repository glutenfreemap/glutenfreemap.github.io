# GlutenFreeMap

This is the repository for https://glutenfreemap.github.io/.


# Running locally

Follow [these instructions](https://docs.github.com/en/pages/setting-up-a-github-pages-site-with-jekyll/testing-your-github-pages-site-locally-with-jekyll), or use Docker, you can run the site locally:
```powershell
docker run --rm -v ${PWD}/docs:/srv/jekyll -p 8080:4000 -it jekyll/jekyll bash
```
Then inside the container, run the following commands:
```bash
bundle install
bundle exec jekyll serve --host 0.0.0.0 --watch --force_polling
```

You can then open http://localhost:8080 and view your changes.

## Initial creation script

This is the command that was used to create the site. You shouldn't need it, but it is here for documentation purposes.
```bash
docker run --rm -v ${PWD}:/srv/jekyll -it jekyll/jekyll jekyll new --skip-bundle --blank .
```
