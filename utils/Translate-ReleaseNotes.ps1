
$path = Join-Path $PSScriptRoot "../site/_changelog/$([DateTime]::Today.ToString("yyyy-MM-dd")).md"
$response = Invoke-WebRequest -UseBasicParsing `
    -Method Post `
    -Uri https://api.openai.com/v1/chat/completions `
    -Headers @{
        "Content-Type" = "application/json"
        "Authorization" = "Bearer $($env:CHATGPT_API_TOKEN)"
    } `
    -Body (@{
        model = "gpt-4o-mini"
        messages = @(
            @{
                role = "system"
                content = "Add the missing translations. Output only the YAML, without any other text or markdown tags and preserve newlines."
            },
            @{
                role = "user"
                content = (Get-Content -Path $path -Raw)
            }
        )
    } | ConvertTo-Json)

$result = $response.Content | ConvertFrom-Json
$translated = $result.choices[0].message.content

Write-Host "Please check the result:" -ForegroundColor Yellow
Write-Host $translated -ForegroundColor Gray

$translated | Set-Content -Path $path -Confirm
