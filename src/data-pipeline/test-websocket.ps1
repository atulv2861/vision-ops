# Install wscat globally if you don't have it (requires Node.js)
# npm install -g wscat

# Socket.io uses a specific protocol over standard WebSockets. 
# To connect to a Socket.io server directly via CLI using raw WebSockets, 
# you connect to the /socket.io/ path with the transport set to websocket.

Write-Host "Connecting to Socket.io WebSocket..."
Write-Host "To exit, press Ctrl+C"

# 1. Using wscat (Recommended for CLI)
wscat -c "ws://localhost:3000/socket.io/?EIO=4&transport=websocket"

# NOTE on Socket.io protocol:
# Once connected via wscat, you must manually send a `40` to complete the Socket.io handshake.
# After sending `40`, the server will log "✅ WebSocket Client Connected".
# You will then start receiving messages like:
# 42["aggregatedMetrics",{"timestamp":"...","current_occupancy":150,...}]

# To test sending data BACK to the server (triggering the 🔥 log):
# Type this exactly in the wscat prompt and press Enter:
# 42["aggregatedMetrics",{"current_occupancy":999}]
