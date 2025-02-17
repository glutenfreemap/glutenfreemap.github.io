$ErrorActionPreference = 'Stop'

$url = "https://static.burgerkingencasa.es/bkhomewebsite/pt/stores_pt.json"

. (Join-Path $PSScriptRoot common.ps1)

$rootDir = Join-Path $PSScriptRoot ".." -Resolve
$outputPath = Join-Path $rootDir "site" "data" "burgerking.json"
$mainDataPath = Join-Path $rootDir "site" "data" "data.json"

Write-Host "Loading gluten-free restaurant list"

Write-Host "Scraping the page"

$page = Invoke-WebRequest `
    -UseBasicParsing `
    -Uri $url `
    @HttpClientCommonParams

$places = ([System.Text.Encoding]::UTF8.GetString($page.Content) | ConvertFrom-Json).stores

Write-Host "Merging the data"

$previousData = if (Test-Path $outputPath) {
    Get-Content -Raw $outputPath | ConvertFrom-Json
} else {
    @()
}

$mainData = Get-Content $mainDataPath | ConvertFrom-Json
$districts = $mainData.districts

$data = $places | % {
    [string]$id = $_.bkcode
    
    $previous = $previousData | ? { $_.id -eq $id }

    $city = $_.city
    $city = [regex]::Replace($city, "(\s(?:D[AEO]S?|\w{1,2})\s)", { param($m) $m.Groups[1].Value.ToLower() })
    $city = [regex]::Replace($city, "((?:^|[^\w])[A-ZÁÀÉÈÍÌÓÒÚÙ])(\w+)", { param($m) $m.Groups[1].Value + $m.Groups[2].Value.ToLower() })

    $place = [ordered]@{
        id = $id
        gid = $previous.gid
        subtitle = $_.address.Trim(',')
        address =
            if ($previous.fixes.address -ne $null) {
                $previous.fixes.address
            } else {
                "$($_.address.Trim(','))","$($_.postalcode -replace ' ','') $city"
            }
        position = [ordered]@{
            lat = [double]$_.latitude
            lng = [double]$_.longitude
        }
        district = $previous.district
    }
    if ($previous.fixes -ne $null) { $place.fixes = $previous.fixes }

    Write-Output $place        
}

$data `
    | ? { $_.district -eq $null } `
    | Write-Throttled 1000 `
    | % {
        Write-Host "Resolving district for $($_.subtitle)"
        $_.district = Resolve-District $_.position.lat $_.position.lng $districts
    }

Write-Host "Updating the output file"
$data | Sort-Object -Property {[int]$_["id"]} | ConvertTo-Json -Depth 10 | Set-Content $outputPath

Write-Host "Done"
