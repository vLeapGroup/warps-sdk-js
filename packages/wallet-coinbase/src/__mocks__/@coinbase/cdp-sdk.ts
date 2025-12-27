export const CdpClient = jest.fn().mockImplementation((config?: any) => {
  return {
    evm: {
      getAccount: jest.fn(),
      signTransaction: jest.fn(),
      signMessage: jest.fn(),
      createAccount: jest.fn(),
      exportAccount: jest.fn(),
      sendTransaction: jest.fn(),
      listAccounts: jest.fn(),
      importAccount: jest.fn(),
    },
    solana: {
      getAccount: jest.fn(),
      signTransaction: jest.fn(),
      signMessage: jest.fn(),
      createAccount: jest.fn(),
      exportAccount: jest.fn(),
      sendTransaction: jest.fn(),
      listAccounts: jest.fn(),
      importAccount: jest.fn(),
    },
  }
})
