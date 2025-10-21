# Use https://www.glyphrstudio.com/app/ to edit the .gs2 project
"ttf","woff","woff2" | % {
  fontforge -lang=ff -c 'Open($1); Generate($2);' "$PSScriptRoot/MaterialIconsSlim-Regular.otf" "$PSScriptRoot/public/fonts/MaterialIconsSlim-Regular.$_"
}

$hash = (Get-FileHash -Algorithm MD5 "$PSScriptRoot/MaterialIconsSlim-Regular.otf").hash

"@font-face {
  font-family: 'Material Icons Slim';
  font-style: normal;
  font-weight: 400;
  src: url(/fonts/MaterialIconsSlim-Regular.woff2?v=$hash) format('woff2'),
       url(/fonts/MaterialIconsSlim-Regular.ttf?v=$hash) format('truetype'),
       url(/fonts/MaterialIconsSlim-Regular.woff?v=$hash) format('woff');
}" | Set-Content "$PSScriptRoot/src/material-icons.scss"
