# AZMaps-MCP Test Suite

Comprehensive test coverage for Azure Maps MCP Server V1 primitives.

## Strategy Overview

**Test Philosophy**: Test Everything Before Deployment  
Following Squad operating principles, this test suite provides **bulletproof validation** of all V1 primitives before production use.

### Test Layers

1. **Unit Tests** (`tests/unit/`): Fast, isolated validation
   - Schema validation (Zod types)
   - Error factories
   - HTTP client behavior (mocked fetch)
   - Retry logic and exponential backoff
   - **No API key required**

2. **Integration Tests** (`tests/integration/`): Real Azure Maps API calls
   - Happy path validation
   - Edge cases (boundaries, invalid input, extreme values)
   - Error handling (no results, rate limits, impossible routes)
   - **Requires `AZURE_MAPS_API_KEY` environment variable**

3. **Performance Benchmarks** (`tests/performance/`): Latency targets from AD-003
   - p50/p95/p99 latency measurements
   - Throughput under concurrent load
   - **Requires `AZURE_MAPS_API_KEY` environment variable**

## Coverage Targets

| Metric     | Target | Rationale                             |
|------------|--------|---------------------------------------|
| Lines      | 80%    | Core logic fully tested               |
| Functions  | 80%    | All public APIs covered               |
| Branches   | 75%    | Edge cases validated                  |
| Statements | 80%    | Execution paths verified              |

## Run Tests Locally

### Prerequisites

```bash
# Install dependencies
npm install

# Set API key for integration/performance tests
export AZURE_MAPS_API_KEY="your-key-here"
```

### Run All Tests

```bash
npm test                  # All tests (unit + integration + performance)
npm run test:unit         # Unit tests only (fast, no API key needed)
npm run test:integration  # Integration tests (requires API key)
npm run test:performance  # Performance benchmarks (requires API key)
npm run test:coverage     # Generate coverage report
```

### Test Behavior Without API Key

- **Unit tests**: Always run (no API key needed)
- **Integration tests**: Skipped gracefully with warning ⚠️  
- **Performance tests**: Skipped gracefully with warning ⚠️

## CI/CD Integration

Use the provided CI/CD script for automated testing:

```bash
./tests/run-ci-tests.sh
```

**Behavior**:
- Runs unit tests (always required to pass)
- Checks for `AZURE_MAPS_API_KEY`
- If key present: runs integration + performance tests
- If key missing: skips integration/performance, exits 0 (allows CI pass)

## Test Fixtures

Test data for integration tests is stored in `tests/fixtures/`:

| Fixture File       | Purpose                                      |
|--------------------|----------------------------------------------|
| `addresses.json`   | Known geocoding test addresses               |
| `routes.json`      | Route test scenarios with expected distances |
| `pois.json`        | POI search test data (dense/sparse areas)    |

**Fixture Format**: Each fixture includes:
- Test input data
- Expected output values (lat/lon, distance, duration)
- Tolerance ranges for validation
- Edge case scenarios

## Performance Interpretation

Performance benchmarks report latencies in milliseconds:

```
Operation                        p50      p95      p99   Target   Status
--------------------------------------------------------------------------------
Geocode (single)               280ms    450ms    520ms    500ms       ✅
Batch Geocode (10)             850ms    980ms   1100ms   1000ms       ⚠️
Route (5 waypoints)           1400ms   1850ms   2100ms   2000ms       ✅
Static Map                    2100ms   2800ms   3200ms   3000ms       ✅
--------------------------------------------------------------------------------
```

**Status Interpretation**:
- ✅ **Pass**: p95 meets target from AD-003
- ⚠️ **Warning**: p95 within 20% tolerance (acceptable for v1)
- ❌ **Fail**: p95 exceeds 20% tolerance (requires optimization)

## Visual Regression: Static Maps

For static map tests (`tests/integration/static-map.test.ts`):

1. **Baseline Generation**: First run generates baseline PNG
2. **Manual Inspection**: Review baseline visually (v1 manual process)
3. **Future Iterations**: Implement pixel diff comparison (< 5% tolerance)

**V1 Scope**: Baseline generation and manual inspection only.  
**Future Enhancement**: Automated visual regression with pixel diff.

## Known Test Gaps

These scenarios cannot be tested without production deployment:

1. **Managed Identity Authentication**: Requires deployed Azure resources
2. **Real Usage Patterns**: Actual travel agent workflows
3. **Production Load**: Real concurrent user traffic
4. **Network Conditions**: Real-world latency variability

**Mitigation**: Monitor production logs after deployment, iterate based on real usage.

## Debugging Failed Tests

### Unit Test Failures

```bash
# Run specific unit test file
npm run test:unit tests/unit/types.test.ts

# Run with detailed output
npm run test:unit -- --reporter=verbose
```

### Integration Test Failures

```bash
# Verify API key is set
echo $AZURE_MAPS_API_KEY

# Run single integration test
npm run test:integration tests/integration/geocode.test.ts

# Enable debug logging (if available)
DEBUG=azure-maps npm run test:integration
```

### Performance Benchmark Failures

- **High latency**: May be transient network issues, run multiple times
- **Consistent failures**: May indicate Azure Maps API throttling or regional issues
- **p95 > target**: Acceptable if within 20% tolerance for v1

## Next Steps After Testing

1. **Run Tests**: Execute full test suite locally
2. **Fix Bugs**: Trinity addresses any failures
3. **Iterate**: Rerun tests until all pass
4. **Deploy**: Proceed with production deployment (Neo's domain)
5. **Monitor**: Watch production logs for real usage patterns

## Test Maintenance

- **Add fixtures**: Extend fixture files for new edge cases
- **Update targets**: Adjust performance targets based on production data
- **Expand coverage**: Add tests for new primitives (v2+)
- **Visual regression**: Implement pixel diff for static maps (future)

---

**Test Coverage Philosophy**: We test what matters. 80% coverage focuses on core logic, not getters/setters. Edge cases get comprehensive validation. Performance targets align with AD-003 latency requirements.
