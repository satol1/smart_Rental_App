# Test Dashboard Endpoint Script

$baseUrl = "http://localhost:8000"

# Get token
$loginBody = @{
    username = "admin@rentalapp.com"
    password = "admin123"
} | ConvertTo-Json

Write-Host "Getting authorization token..." -ForegroundColor Yellow

try {
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/token" -Method POST -Body $loginBody -ContentType "application/json"
    $token = $loginResponse.access_token
    Write-Host "Token received successfully!" -ForegroundColor Green
    
    # Test dashboard endpoint
    Write-Host "Testing /api/admin/dashboard-summary endpoint..." -ForegroundColor Yellow
    
    $headers = @{
        "Authorization" = "Bearer $token"
    }
    
    $dashboardResponse = Invoke-RestMethod -Uri "$baseUrl/api/admin/dashboard-summary" -Method GET -Headers $headers
    
    Write-Host "Endpoint works successfully!" -ForegroundColor Green
    Write-Host "Response:" -ForegroundColor Cyan
    $dashboardResponse | ConvertTo-Json -Depth 10
    
} catch {
    Write-Host "Error occurred" -ForegroundColor Red
    Write-Host "Details:" -ForegroundColor Yellow
    $_.Exception | Format-List -Force
}
