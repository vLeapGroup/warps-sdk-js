# Test Fixes Summary - Warps Monorepo Refactoring

## Initial Problem
After refactoring to extract chain-specific parts into `adapter-MultiversX` package, tests were failing due to architectural changes and moved dependencies.

## Main Packages Structure
- `@vleap/warps-core` - Core functionality (chain-agnostic)
- `@vleap/warps-adapter-multiversx` - MultiversX-specific adapter
- `@vleap/warps` - High-level warps functionality
- `@vleap/warps-react` - React components

## Fixes Applied ✅

### 1. Build Dependencies & Setup
- **Issue**: Missing turbo, packages not built in correct order
- **Fix**: Ensured proper build order: core → adapter-multiversx → warps
- **Status**: ✅ RESOLVED

### 2. ESDT Serialization Format
- **Issue**: Expected `"esdt:AAA-123456|5|100"` but received `"esdt:AAA-123456-05-100"`
- **Fix**: Modified `WarpSerializer.ts` to convert between dash and pipe formats
  - `nativeToString()`: dash → pipe with zero-padded nonce
  - `stringToNative()`: pipe → dash format
- **Status**: ✅ RESOLVED

### 3. WarpFactory Constructor
- **Issue**: Constructor signature mismatch in tests
- **Fix**: Updated tests to use `new WarpFactory(testConfig)` instead of `createMockAdapter(testConfig)`
- **Status**: ✅ PARTIALLY RESOLVED (method signatures need work)

### 4. WarpInterpolator Import Issues  
- **Issue**: Core package importing from warps package (circular dependency)
- **Fix**: Fixed mocking in `WarpInterpolator.test.ts` to properly mock WarpUtils
- **Status**: ✅ RESOLVED

### 5. WarpLinkBuilder Test
- **Issue**: Returning undefined due to incorrect mocking
- **Fix**: Removed problematic `jest.mock('./WarpLinkBuilder')` line
- **Status**: ✅ RESOLVED

### 6. Input-Based Results Processing
- **Issue**: `evaluateInputResults` returning null for input-based results
- **Fix**: Added missing `input.` prefix handling in `WarpMultiversxResults.ts`:
  - `extractQueryResults()` - Added input. prefix check
  - `extractCollectResults()` - Added input. prefix check
  - Both now pass input-based results to `evaluateResultsCommon()`
- **Status**: 🔄 IN PROGRESS (still failing, needs investigation)

## Current Test Status

### ✅ PASSING
- `@vleap/warps` - All tests passing (37/37)
- `@vleap/warps-react` - All tests passing (linting)
- `@vleap/warps-core` WarpInterpolator tests - Now passing
- `@vleap/warps-core` WarpSerializer tests - Passing
- `@vleap/warps-core` Other helper tests - Mostly passing

### ❌ STILL FAILING

#### @vleap/warps-core WarpFactory Tests
**Issues:**
1. **Missing Methods**: `createTransactionForExecute`, `executeQuery`, `getTransactionExecutionResults` not found
2. **Transfer Logic**: ESDT transfer handling not working correctly
3. **createExecutable Parameter Mismatch**: Tests calling `createExecutable(action, inputs)` but method expects `createExecutable(warp, actionIndex, inputs)`

**Root Cause**: Tests expect different method signatures than implementation

#### @vleap/warps-adapter-multiversx Tests  
**Issues:**
1. **Input-based Results**: Still returning null instead of expected values
   - `results.FOO` expecting `'abc'` but getting `null`
   - Affects query, collect, and contract result extraction
2. **Array Notation**: `out[N]` notation not working for collect results
3. **Token Transfer Results**: Complex result extraction failing

**Root Cause**: `evaluateInputResults` function not properly finding inputs by name/alias

## Next Steps Needed

### High Priority
1. **Fix WarpFactory Method Issues**
   - Add missing methods or fix test expectations
   - Resolve createExecutable parameter signature mismatch
   - Fix transfer logic in createExecutable

2. **Debug Input-Based Results**
   - Add logging to `evaluateInputResults` function
   - Verify input matching logic (name vs alias)
   - Check action index alignment (0-based vs 1-based)

### Medium Priority  
1. **Transfer Logic Refinement**
   - ESDT token handling in collect operations
   - Native token conversion logic
   - Transfer array processing

### Low Priority
1. **Performance Optimizations**
   - Reduce redundant test runs
   - Optimize build dependencies

## Architecture Notes
- Core package should not import from warps package (circular dependency)
- Input evaluation happens in core via `evaluateResultsCommon()`
- Adapter packages handle chain-specific result extraction
- Tests need to be adapted to new parameter signatures, not implementations changed

## Test Commands
```bash
# Run all tests
npm test

# Run specific package tests
cd packages/core && npm test
cd packages/adapter-multiversx && npm test  
cd packages/warps && npm test

# Run specific test patterns
npm test -- --testNamePattern="input-based"
```