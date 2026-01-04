# Project Instructions

## Code Style

- Use arrow functions
- Use types over interfaces
- All code must be coherent in the same coding style as the existing codebase.
- Do not use workarounds and strive for clean code.
- We keep code brief rather than verbose.
- Business logic should be tested, in tests that are clean, follow existing testing patterns, and code style is brief and inline (as much as makes sense for readability)
- In tests, mock as little as necessary. Always use the real functions to test and don't mock other related functions, unless they call external services.
- Use the playground with devnet to verify that new additions or changes work without errors.
- Iterate until warps and tests work as expected without errors.
- Any executed transaction on the playground must be verified for success status using either a CLI tool (if available) or the Explorer. Your task is not done unless all transactions are in expected state.
- Remove files that are not needed for commiting to the source code or nowhere referenced.
- Whenever you run the playground, log the used inputs and the outputs and messages to the results.md file. Clear the results.md file before writing to it.
