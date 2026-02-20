# Test fetching aggregated metrics
Write-Host "Fetching latest aggregated metrics..."
curl.exe -X GET "http://localhost:3000/api/data-pipeline/aggregated-metrics" -H "Content-Type: application/json"
Write-Host "`n"

# Verify Raw Events directly via Elasticsearch
Write-Host "Fetching raw camera events directly from Elasticsearch..."
curl.exe -s -X GET "http://34.173.116.41:9200/vision-ops-camera/_search?size=5&sort=timestamp:desc" -u "elastic:variphi@2024" -H "Content-Type: application/json"
Write-Host "`n"

# Verify Aggregated Events directly via Elasticsearch
Write-Host "Fetching aggregated events directly from Elasticsearch..."
curl.exe -s -X GET "http://34.173.116.41:9200/vision-ops-aggregated-events/_search?size=5&sort=timestamp:desc" -u "elastic:variphi@2024" -H "Content-Type: application/json"
Write-Host "`n"
