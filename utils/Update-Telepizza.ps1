# nuget restore -PackagesDirectory packages

Param(
    [switch] $AddMissingPlaces
)

$ErrorActionPreference = 'Stop'

$glutenFreeStoresUrl = "https://www.telepizza.pt/pizzas-sem-gluten.html"

. (Join-Path $PSScriptRoot common.ps1)

$rootDir = Join-Path $PSScriptRoot ".." -Resolve
$outputPath = Join-Path $rootDir "site" "data" "telepizza.json"
$mainDataPath = Join-Path $rootDir "site" "data" "data.json"

Add-Type -AssemblyName "$PSScriptRoot/packages/HtmlAgilityPack.1.11.46/lib/netstandard2.0/HtmlAgilityPack.dll"

function Format-StringIdentifier ([string]$str)
{
    $str = $str.ToUpperInvariant() -replace " ",""
    $str = Remove-StringDiacritic $str
    return $str
}

Write-Host "Scraping the page"

$page = Invoke-WebRequest `
    -UseBasicParsing `
    -Uri $glutenFreeStoresUrl `
    @HttpClientCommonParams

$doc = New-Object HtmlAgilityPack.HtmlDocument
$doc.LoadHtml($page.Content)

$manualFixes = @{
    "FORUM VISEU (só local)" = "232094363"
}

$placesByPhoneNumber = @{}
$doc.DocumentNode.SelectNodes("//ul[@class='infotable']/li") `
    | % {
        $phoneNumber = $_.SelectSingleNode("p/text()").Text.Trim() -replace " ",""
        $name = [System.Web.HttpUtility]::HtmlDecode(($_.SelectSingleNode("p/strong/text()|p/b/text()").Text.Trim()))

        if ($manualFixes.ContainsKey($name)) {
            $phoneNumber = $manualFixes[$name]
        }

        if ($placesByPhoneNumber.ContainsKey($phoneNumber)) {
            Write-Error "Found a duplicate phone number $phoneNumber for places '$name' and '$($placesByPhoneNumber[$phoneNumber])'"
            exit 1
        }

        $placesByPhoneNumber.Add($phoneNumber, $name)
    }

Write-Host "Merging the data"

$previousData = if (Test-Path $outputPath) {
    Get-Content -Raw $outputPath | ConvertFrom-Json
} else {
    @()
}

$data = $previousData `
    | % {
        if ($placesByPhoneNumber.ContainsKey($_.id)) {
            # Found existing
            $placesByPhoneNumber.Remove($_.id)
            echo $_
        } else {
            Write-Warning "Place '$($_.subtitle)' ($($_.id)) has been removed"
        }
    }

$placesToIgnore = @(
    "210489034" # Sta Marta
)
$hasMissingPlaces = $false

$placesByPhoneNumber.GetEnumerator() `
    | ? { -not $placesToIgnore.Contains($_.Key) }
    | % {
        Write-Warning "Place '$($_.Value)' ($($_.Key)) is missing"
        if ($AddMissingPlaces) {
            $data += [PSCustomObject]@{
                id = $_.Key
                subtitle = $_.value | % { [String]::Join(" ", ($_.Split(" ") | % { "$($_[0])$($_.Substring(1).ToLower())" })) }
                address = @("TODO", "TODO")
                position = [PSCustomObject]@{
                    lat = "TODO"
                    lng = "TODO"
                }
                district = "TODO"
            }
        } else {
            $hasMissingPlaces = $true
        }
    }

if ($hasMissingPlaces) {
    throw "There are missing places"
}

Write-Host "Updating the output file"
$json = $data `
    | Sort-Object -Property subtitle `
    | ConvertTo-Json

$json.Replace("`r`n", "`n") | Set-Content $outputPath

Write-Host "Done"
