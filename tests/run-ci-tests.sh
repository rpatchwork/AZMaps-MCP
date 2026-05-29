#!/bin/bash
# CI/CD Test Runner for AZMaps-MCP
# Runs unit tests (always), integration + performance tests (if API key present)

set -e  # Exit on first error

echo "=================================="
echo "AZMaps-MCP CI/CD Test Runner"
echo "=================================="

# Run unit tests (required)
echo ""
echo "▶ Running unit tests (no API key needed)..."
npm run test:unit

# Check for API key
if [ -z "$AZURE_MAPS_API_KEY" ]; then
  echo ""
  echo "⚠️  AZURE_MAPS_API_KEY not set"
  echo "   Skipping integration and performance tests"
  echo "   (This is OK for CI - unit tests passed)"
  echo ""
  exit 0
fi

# Run integration tests
echo ""
echo "▶ Running integration tests (API key found)..."
npm run test:integration

# Run performance benchmarks
echo ""
echo "▶ Running performance benchmarks..."
npm run test:performance

echo ""
echo "=================================="
echo "✅ All tests passed!"
echo "=================================="
