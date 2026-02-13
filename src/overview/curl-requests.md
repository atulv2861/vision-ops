# Overview API - cURL Test Requests

Base URL: `http://localhost:3000/api/overview`

## 1. Get All Events (with pagination)

```bash
# Get first 100 events (default)
curl -X GET "http://localhost:3000/api/overview"

# Get first 50 events
curl -X GET "http://localhost:3000/api/overview?from=0&size=50"

# Get next 50 events (pagination)
curl -X GET "http://localhost:3000/api/overview?from=50&size=50"

# Get events sorted by timestamp ascending
curl -X GET "http://localhost:3000/api/overview?sort=timestamp:asc"

# Get events sorted by timestamp descending (default)
curl -X GET "http://localhost:3000/api/overview?sort=timestamp:desc"
```

## 2. Search Events (with filters)

```bash
# Text search for "gate"
curl -X GET "http://localhost:3000/api/overview/search?q=gate"

# Filter by event type
curl -X GET "http://localhost:3000/api/overview/search?event_type=gate_entry"

# Filter by severity
curl -X GET "http://localhost:3000/api/overview/search?severity=LOW"

# Filter by zone ID
curl -X GET "http://localhost:3000/api/overview/search?zone_id=ZONE01"

# Combined search: text + event type + severity
curl -X GET "http://localhost:3000/api/overview/search?q=gate&event_type=gate_entry&severity=LOW"

# Combined search with pagination
curl -X GET "http://localhost:3000/api/overview/search?q=campus&event_type=metric_update&from=0&size=20"
```

## 3. Get Statistics/Aggregations

```bash
# Get all statistics
curl -X GET "http://localhost:3000/api/overview/stats"
```

## 4. Get Events by Event Type

```bash
# Get all metric_update events
curl -X GET "http://localhost:3000/api/overview/by-event-type?event_type=metric_update"

# Get all gate_entry events
curl -X GET "http://localhost:3000/api/overview/by-event-type?event_type=gate_entry"
```

## 5. Get Events by Zone

```bash
# Get all events for ZONE01
curl -X GET "http://localhost:3000/api/overview/by-zone?zone_id=ZONE01"

# Get all events for ZONE_ALL
curl -X GET "http://localhost:3000/api/overview/by-zone?zone_id=ZONE_ALL"
```

## 6. Get Space Utilization (Top 5)

```bash
# Get top 5 spaces by utilization
curl -X GET "http://localhost:3000/api/overview/space-utilization"
```

## Pretty Print JSON (add `| jq` if you have jq installed)

```bash
# Example with pretty print
curl -X GET "http://localhost:3000/api/overview" | jq

# Or use Python for pretty print
curl -X GET "http://localhost:3000/api/overview" | python -m json.tool
```

## Windows PowerShell Alternative

For `GET` requests, `Invoke-RestMethod` works well. For file uploads, it's recommended to use `curl.exe` as `Invoke-RestMethod` syntax varies by PowerShell version.

```powershell
# Get all events
Invoke-RestMethod -Uri "http://localhost:3000/api/overview" -Method Get

# Search events
Invoke-RestMethod -Uri "http://localhost:3000/api/overview/search?q=gate&event_type=gate_entry" -Method Get

# Get statistics
Invoke-RestMethod -Uri "http://localhost:3000/api/overview/stats" -Method Get

# Get Space Utilization
Invoke-RestMethod -Uri "http://localhost:3000/api/overview/space-utilization" -Method Get
```

## 7. Get Active Alerts

```bash
# Get active alerts
curl -X GET "http://localhost:3000/api/overview/active-alerts"
```

# Get campus traffic
curl -X GET "http://localhost:3000/api/overview/campus-traffic"

# Get security access
curl -X GET "http://localhost:3000/api/overview/security-access"