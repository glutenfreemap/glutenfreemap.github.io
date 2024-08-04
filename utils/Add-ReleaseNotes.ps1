
$added = @()
$removed = @()

git diff origin/master...HEAD | ? { $_ -match '([+-])\s*"name":\s*\"([^"]+)' } | % {
    if ($Matches[1] -eq "+") {
        $added += $Matches[2]
    } else {
        $removed += $Matches[2]
    }
}

$template = git log --pretty=format:"%s" origin/master...master

if ($added.Count -gt 0) {
    $template = "$template`n`nNovos estabelecimentos adicionados:`n- $([String]::Join("`n- ", $added))"
}
if ($removed.Count -gt 0) {
    $template = "$template`n`nEstabelecimentos removidos:`n- $([String]::Join("`n- ", $removed))"
}

$path = Join-Path $PSScriptRoot "../site/_changelog/$([DateTime]::Today.ToString("yyyy-MM-dd")).md"
"---
pt: |
  $($template.Replace("`n", "`r`n  "))
en: |
  replace by the English translation
fr: |
  replace by the French translation
es: |
  replace by the Spanish translation
---
" | Set-Content $path
code -r $path