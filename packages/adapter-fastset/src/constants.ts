export const WarpFastsetConstants = {
  Pi: {
    Identifier: 'PI',
    DisplayName: 'Pi',
    Decimals: 18,
  },
  GasLimit: {
    Default: 21000,
    ContractCall: 100000,
    ContractDeploy: 500000,
    Transfer: 21000,
    Approve: 46000,
    Swap: 200000,
  },
  GasPrice: {
    Default: '20000000000', // 20 gwei
    Low: '10000000000', // 10 gwei
    Medium: '20000000000', // 20 gwei
    High: '50000000000', // 50 gwei
  },
  Validation: {
    AddressLength: 42,
    HexPrefix: '0x',
    MinGasLimit: 21000,
    MaxGasLimit: 30000000,
  },
  Timeouts: {
    DefaultRpcTimeout: 30000, // 30 seconds
    GasEstimationTimeout: 10000, // 10 seconds
    QueryTimeout: 15000, // 15 seconds
  },
}
