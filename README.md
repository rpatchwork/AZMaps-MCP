# AZMaps-MCP

Deploy an Azure Maps instance and overlay an MCP Server for use by other tools.

## Architecture

**Transport:** HTTP/SSE (Server-Sent Events) for Azure Container Apps deployment
- **Endpoint:** `POST /message` - MCP JSON-RPC over HTTP with SSE
- **Health Check:** `GET /healthz` - Container health probe endpoint
- **Port:** 3000 (configurable via `PORT` environment variable)

The server implements the Model Context Protocol over HTTP using SSEServerTransport, enabling network-accessible MCP services in Azure Container Apps.
