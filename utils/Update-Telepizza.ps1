# nuget restore -PackagesDirectory packages

$ErrorActionPreference = 'Stop'

$storesApiUrl = "https://www.telepizza.pt/General/GetFilteredStores/"
$glutenFreeStoresUrl = "https://www.telepizza.pt/pizzas-sem-gluten.html"

. (Join-Path $PSScriptRoot common.ps1)

$rootDir = Join-Path $PSScriptRoot ".." -Resolve
$outputPath = Join-Path $rootDir "site" "data" "telepizza.json"
$mainDataPath = Join-Path $rootDir "site" "data" "data.json"

Add-Type -AssemblyName "$PSScriptRoot/packages/HtmlAgilityPack.1.11.46/lib/netstandard2.0/HtmlAgilityPack.dll"

Write-Host "Scraping the store list"

$storesResponse = Invoke-WebRequest `
    -UseBasicParsing `
    -Method Post `
    -Form @{
        includeSliceStores = "true"
        storeIds = ""
    } `
    -Uri $storesApiUrl `
    @HttpClientCommonParams

function Format-StringIdentifier ([string]$str)
{
    $str = $str.ToUpperInvariant() -replace " ",""
    $str = Remove-StringDiacritic $str
    return $str
}

$placesByPhoneNumber = @{}
$placesByName = @{}

$storesResponse.Content `
    | ConvertFrom-Json `
    | % {
        $placesByPhoneNumber.Add($_.phone_number, $_)

        $stringId = Format-StringIdentifier $_.name
        $placesByName.Add($stringId, $_)
    }

Write-Host "Scraping the page"

$page = Invoke-WebRequest `
    -UseBasicParsing `
    -Uri $glutenFreeStoresUrl `
    @HttpClientCommonParams

$doc = New-Object HtmlAgilityPack.HtmlDocument
$doc.LoadHtml($page.Content)

$ids = @{}
$places = $doc.DocumentNode.SelectNodes("//ul[@class='infotable']/li") `
    | % {
        @{
            phone = $_.SelectSingleNode("p/text()").Text.Trim() -replace " ",""
            name = [System.Web.HttpUtility]::HtmlDecode(($_.SelectSingleNode("p/strong/text()|p/b/text()").Text.Trim()))
        }
    } `
    | Get-UniqueUnsorted { $_.phone } <# Exclude duplicate phone numbers #> `
    | % {
        # Try to match by name, fallback to match by phone number
        $place = $null
        $stringId = Format-StringIdentifier $_.name
        if ($placesByName.ContainsKey($stringId)) {
            $place = $placesByName[$stringId]
        } elseif ($placesByPhoneNumber.ContainsKey($_.phone)) {
            $place = $placesByPhoneNumber[$_.phone]
        }

        if ($place -ne $null) {
            if ($ids.ContainsKey($place.store_id)) {
                Write-Warning "Resolved two stores to the same id '$($place.store_id)'. This one is named '$($_.name)', with phone number '$($_.phone)'"
            } else {
                $ids.Add($place.store_id, $null)
                Write-Output $place
            }
        } else {
            Write-Warning "Could not find store named '$($_.name)' or with phone number '$($_.phone)'"
        }
    }

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
        [string]$id = $_.store_id
        $previous = $previousData | ? { $_.id -eq $id }

        $place = [ordered]@{
            id = $id
            subtitle = $_.name
            address = if ($previous.fixes.address -ne $null) {
                    $previous.fixes.address
                } else {
                    @(
                        $_.address_line_1,
                        $_.address_line_2
                    )
                }
            position = [ordered]@{
                lat = $_.latitude
                lng = $_.longitude
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
