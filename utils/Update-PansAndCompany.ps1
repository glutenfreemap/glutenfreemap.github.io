$url = "https://www.pansandcompany.pt/onde-estamos/"

. (Join-Path $PSScriptRoot common.ps1)

$rootDir = Join-Path $PSScriptRoot ".." -Resolve
$outputPath = Join-Path $rootDir "docs" "data" "pansandcompany.json"
$mainDataPath = Join-Path $rootDir "docs" "data" "data.json"

Write-Host "Scraping the page"

$page = Invoke-WebRequest `
    -UseBasicParsing `
    -Uri $url `
    @HttpClientCommonParams

$matched = $page.Content -match "(?s-imnx:var settings\s*=\s*(\{.*?\});)"
if (-not $matched) {
    throw "Failed to parse the page"
}

$settings = $Matches[1] | ConvertFrom-Json
$places = $settings.pins.pins `
    | Select-Object id, title, latlng, @{label="tipXml";expression={[xml]"<x>$($_.tooltipContent -replace '&','&amp;' -replace '<br>',"`n" -replace '<br />',"`n")</x>"}} `
    | Select-Object id, title, latlng, @{label="address";expression={$_.tipXml.x.div.p.FirstChild.NextSibling.Value.Trim("`n").Replace("`n`n", "`n")}}

Write-Host "Merging the data"

$previousData = if (Test-Path $outputPath) {
    Get-Content -Raw $outputPath | ConvertFrom-Json
} else {
    @()
}

$mainData = Get-Content $mainDataPath | ConvertFrom-Json
$districts = $mainData.districts

$data = $places `
    | % {
        [string]$id = $_.id
        $previous = $previousData | ? { $_.id -eq $id }

        $place = [ordered]@{
            id = $id
            subtitle = $_.title -replace "PANS & COMPANY - ",""
            address =
                if ($previous.fixes.address -ne $null) {
                    $previous.fixes.address
                } else {
                    $_.address.Split("`n")
                }
            position = [ordered]@{
                lat = $_.latlng[0]
                lng = $_.latlng[1]
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
$data | ConvertTo-Json -Depth 10 | Set-Content $outputPath

Write-Host "Done"
