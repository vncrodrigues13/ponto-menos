#!/bin/bash

# === Punchin API Test Requests ===
# Run these curl commands to test the punchin endpoints

BASE_URL="http://localhost:3001/punchin"

echo "=== Test 1: Check-in from Android ==="
curl -X POST "$BASE_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "timestamp": "2026-03-10T08:30:00Z",
    "platform": "android",
    "authToken": "token_user_001"
  }'
echo -e "\n"

echo "=== Test 2: Check-in from iOS ==="
curl -X POST "$BASE_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "timestamp": "2026-03-10T08:45:00Z",
    "platform": "ios",
    "authToken": "token_user_002"
  }'
echo -e "\n"

echo "=== Test 3: Check-in from Windows ==="
curl -X POST "$BASE_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "timestamp": "2026-03-10T09:00:00Z",
    "platform": "windows",
    "authToken": "token_user_001"
  }'
echo -e "\n"

echo "=== Test 4: Check-in from macOS ==="
curl -X POST "$BASE_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "timestamp": "2026-03-10T09:15:00Z",
    "platform": "macos",
    "authToken": "token_user_003"
  }'
echo -e "\n"

echo "=== Test 5: Check-in from Linux ==="
curl -X POST "$BASE_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "timestamp": "2026-03-10T09:30:00Z",
    "platform": "linux",
    "authToken": "token_user_002"
  }'
echo -e "\n"

echo "=== Test 6: List all punchin entries ==="
curl -X GET "$BASE_URL" \
  -H "Content-Type: application/json"
echo -e "\n"
