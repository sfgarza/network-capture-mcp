#!/bin/bash

# Quick restart script for MCP server development
echo "Stopping MCP server..."
pkill -f "proxy-traffic-mcp" || true

echo "Waiting for process to stop..."
sleep 2

echo "Starting MCP server..."
npm run dev &

echo "MCP server restarted!"
echo "Process ID: $!"
