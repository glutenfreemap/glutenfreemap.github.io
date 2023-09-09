. (Join-Path $PSScriptRoot common.ps1)

Write-Host "Parsing the data"

$output = New-TemporaryFile
Start-Process "docker" "run --rm -i pdftotext" -RedirectStandardInput .\Lista-de-Restaurantes-BKP-gluten-free.pdf -RedirectStandardOutput $output -NoNewWindow -Wait

$data = Get-Content $output #| select -First 6
Remove-Item $output

# Skip the first 2 lines
$firstLine = 2
$previousLine = $firstLine - 1
$venues = @()
for ($i = $firstLine; $i -lt $data.Count; $i++) {
    $line = $data[$i]
    if ($line -match "^(\d+) {2,}((?:[^\s]+ )*[^\s]+)(?: {2,}((?:[^\s]+ )*[^\s]+)? {2,}((?:[^\s]+ )*[^\s]+))?\r?$") {
        [int]$id = $Matches[1]
        $name = $Matches[2]
        $address = $Matches[3]
        $city = $Matches[4]

        if ($i -ne $previousLine + 1) {
            if ($data[$i - 1] -match "^ {2,}((?:[^\s]+ )*[^\s]+)(?: {2,}((?:[^\s]+ )*[^\s]+))?\r?$") {
                $address = $Matches[1] + " " + $address
                $city = $Matches[2] + " " + $city
            }

            if ($data[$i + 1] -match "^ {2,}((?:[^\s]+ )*[^\s]+)(?: {2,}((?:[^\s]+ )*[^\s]+))?\r?$") {
                $address = $address + " " + $Matches[1]
                $city = $city + " " + $Matches[2]
            }

            $i++
        }

        $venues += [pscustomobject]@{
            id = $id
            name = $name
            address = ($address -replace "\s+"," ").Trim()
            city = ($city -replace "\s+"," ").Trim()
        }

        $previousLine = $i
    }
}

$venues | ConvertTo-Csv | Set-Content (Join-Path $PSScriptRoot "BurgerKingGlutenFree.csv")
