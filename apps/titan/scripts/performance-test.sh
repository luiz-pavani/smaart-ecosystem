#!/bin/bash

# Academy Management System - Performance Testing Suite
# Tests all critical APIs for response time, throughput, and reliability

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="${BASE_URL:-http://localhost:3000}"
NUM_REQUESTS="${NUM_REQUESTS:-100}"
CONCURRENT_REQUESTS="${CONCURRENT_REQUESTS:-10}"
TEST_RESULTS_FILE="/tmp/academy_perf_results_$(date +%s).json"

echo -e "${BLUE}╔════════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   SMAART Pro - Academy Management System Performance Test Suite        ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}Configuration:${NC}"
echo "  Base URL: $BASE_URL"
echo "  Total Requests per Endpoint: $NUM_REQUESTS"
echo "  Concurrent Requests: $CONCURRENT_REQUESTS"
echo "  Results File: $TEST_RESULTS_FILE"
echo ""

# Initialize results
{
  echo "{"
  echo '  "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'",'
  echo '  "configuration": {'
  echo '    "base_url": "'$BASE_URL'",'
  echo '    "total_requests": '$NUM_REQUESTS','
  echo '    "concurrent_requests": '$CONCURRENT_REQUESTS
  echo '  },'
  echo '  "tests": ['
} > "$TEST_RESULTS_FILE"

# Function to run performance test on an endpoint
test_endpoint() {
  local name=$1
  local method=$2
  local endpoint=$3
  local data=$4
  
  echo -e "${YELLOW}Testing:${NC} $name ($method $endpoint)"
  
  local total_time=0
  local min_time=999999
  local max_time=0
  local success_count=0
  local error_count=0
  declare -a response_times

  # Run requests
  for i in $(seq 1 $NUM_REQUESTS); do
    if [ $((i % 10)) -eq 0 ]; then
      echo -ne "  Progress: $i/$NUM_REQUESTS requests\r"
    fi

    if [ "$method" = "GET" ]; then
      response=$(curl -s -w "\n%{http_code}\n%{time_total}" "$BASE_URL$endpoint")
    else
      response=$(curl -s -w "\n%{http_code}\n%{time_total}" -X $method \
        -H "Content-Type: application/json" \
        -d "$data" \
        "$BASE_URL$endpoint")
    fi

    http_code=$(echo "$response" | tail -2 | head -1)
    response_time=$(echo "$response" | tail -1)

    response_times+=($response_time)
    total_time=$(echo "$total_time + $response_time" | bc)

    if [ "$http_code" -eq 200 ] || [ "$http_code" -eq 201 ]; then
      ((success_count++))
    else
      ((error_count++))
    fi

    # Track min/max
    if (( $(echo "$response_time < $min_time" | bc -l) )); then
      min_time=$response_time
    fi
    if (( $(echo "$response_time > $max_time" | bc -l) )); then
      max_time=$response_time
    fi
  done

  # Calculate statistics
  local avg_time=$(echo "scale=3; $total_time / $NUM_REQUESTS" | bc)
  local success_rate=$(echo "scale=1; ($success_count / $NUM_REQUESTS) * 100" | bc)

  echo -e "  Progress: $NUM_REQUESTS/$NUM_REQUESTS requests ✓"
  echo -e "${GREEN}  ✓ Success: $success_count/$NUM_REQUESTS ($success_rate%)${NC}"
  [ $error_count -gt 0 ] && echo -e "${RED}  ✗ Errors: $error_count${NC}"
  echo -e "  Avg Response Time: ${avg_time}s"
  echo -e "  Min Response Time: ${min_time}s"
  echo -e "  Max Response Time: ${max_time}s"
  echo ""

  # Append to results file
  {
    echo '    {'
    echo '      "name": "'$name'",'
    echo '      "method": "'$method'",'
    echo '      "endpoint": "'$endpoint'",'
    echo '      "success_count": '$success_count','
    echo '      "error_count": '$error_count','
    echo '      "success_rate": '$success_rate','
    echo '      "avg_response_time_seconds": '$avg_time','
    echo '      "min_response_time_seconds": '$min_time','
    echo '      "max_response_time_seconds": '$max_time
    echo '    },'
  } >> "$TEST_RESULTS_FILE"
}

# ============================================================================
# API ENDPOINT TESTS
# ============================================================================

echo -e "${BLUE}═══════════════════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}PHASE 1: Academy Dashboard API${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════════════════${NC}"
echo ""
test_endpoint "Dashboard Metrics" "GET" "/api/academy" ""

echo -e "${BLUE}═══════════════════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}PHASE 2: Financial API${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════════════════${NC}"
echo ""
test_endpoint "Financial Dashboard" "GET" "/api/academy/financial?type=dashboard" ""
test_endpoint "Financial Reports - Modality" "GET" "/api/academy/financial?type=modality" ""
test_endpoint "Financial Reports - Expenses" "GET" "/api/academy/financial?type=expenses" ""

echo -e "${BLUE}═══════════════════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}PHASE 3: Attendance API${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════════════════${NC}"
echo ""
test_endpoint "Attendance Records - Today" "GET" "/api/academy/attendance/today" ""

echo -e "${BLUE}═══════════════════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}PHASE 4: Federation API${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════════════════${NC}"
echo ""
test_endpoint "Federation Overview" "GET" "/api/academy/federation?type=overview" ""
test_endpoint "Federation Events" "GET" "/api/academy/federation?type=events" ""
test_endpoint "Federation Athletes" "GET" "/api/academy/federation?type=athletes" ""

# ============================================================================
# CONCURRENT REQUEST TESTS
# ============================================================================

echo -e "${BLUE}═══════════════════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}PHASE 5: Concurrent Load Testing${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════════════════${NC}"
echo ""

echo -e "${YELLOW}Testing:${NC} Dashboard API (Concurrent Load)"
echo "  Sending $CONCURRENT_REQUESTS concurrent requests..."

total_time=0
success_count=0
for i in $(seq 1 $CONCURRENT_REQUESTS); do
  (
    response=$(curl -s -w "%{http_code}|%{time_total}" "$BASE_URL/api/academy")
    http_code=$(echo "$response" | cut -d'|' -f1)
    response_time=$(echo "$response" | cut -d'|' -f2)
    echo "$response_time:$http_code"
  ) &
done

responses=$(wait)
echo -e "${GREEN}  ✓ Completed concurrent requests${NC}"

# ============================================================================
# FINALIZE RESULTS
# ============================================================================

# Remove trailing comma from last test
sed -i '$ s/,$//' "$TEST_RESULTS_FILE"

{
  echo '  ]'
  echo '}'
} >> "$TEST_RESULTS_FILE"

echo -e "${BLUE}═══════════════════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✓ Performance Testing Complete${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════════════════${NC}"
echo ""
echo "Results saved to: $TEST_RESULTS_FILE"
echo ""
echo "Summary:"
cat "$TEST_RESULTS_FILE" | head -20

exit 0
