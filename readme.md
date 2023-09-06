# GlutenFreeMap

This is the repository for https://glutenfreemap.org/.

This program is free software: you can redistribute it and/or modify it under the terms of the [GNU General Public License](COPYING) as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.

You should have received a copy of the GNU General Public License along with this program. If not, see <https://www.gnu.org/licenses/>. 

# Running locally

Follow [these instructions](https://docs.github.com/en/pages/setting-up-a-github-pages-site-with-jekyll/testing-your-github-pages-site-locally-with-jekyll), or use Docker:
```powershell
docker-compose up
```

You can then open http://localhost:8080 and view your changes.

## Initial creation script

This is the command that was used to create the site. You shouldn't need it, but it is here for documentation purposes.
```bash
docker run --rm -v ${PWD}:/srv/jekyll -it jekyll/jekyll jekyll new --skip-bundle --blank .
```
