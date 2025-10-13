# Use https://www.glyphrstudio.com/app/ to edit the .gs2 project
"ttf","woff","woff2" | % {
  #& 'C:\Program Files (x86)\FontForgeBuilds\bin\fontforge.exe' -lang=ff -c 'Open($1); Generate($2);' .\MaterialIconsSlim-Regular.otf ".\public\fonts\MaterialIconsSlim-Regular.$_"
  fontforge -lang=ff -c 'Open($1); Generate($2);' MaterialIconsSlim-Regular.otf "./public/fonts/MaterialIconsSlim-Regular.$_"
}
