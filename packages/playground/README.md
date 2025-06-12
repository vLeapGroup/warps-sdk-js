# Playground for Warps

This package allows you to test and run warps in isolation before bundling or releasing them.

## Usage

1. Place your warp files in `warps/` (e.g., `example.ts`).
2. Run the playground with:

```sh
cd packages/playground
npx ts-node playground.ts
```

The playground will load and run the first warp it finds in the `warps/` directory.

You can modify `playground.ts` to select different warps or add CLI arguments as needed.
