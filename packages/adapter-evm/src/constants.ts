export const WarpEvmConstants = {
  ChainName: 'evm',
  ChainPrefix: 'evm',
  Ether: {
    Identifier: 'ETH',
    DisplayName: 'Ether',
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
  Network: {
    Ethereum: {
      ChainId: '1',
      Name: 'Ethereum',
      BlockTime: 12,
    },
    Arbitrum: {
      ChainId: '42161',
      Name: 'Arbitrum',
      BlockTime: 1,
    },
    Base: {
      ChainId: '8453',
      Name: 'Base',
      BlockTime: 2,
    },
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
