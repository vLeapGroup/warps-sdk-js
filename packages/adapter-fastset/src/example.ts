import { FastsetClient } from './sdk/FastsetClient'

async function example() {
  console.log('🚀 FastSet Client Example')
  console.log('='.repeat(50))

  // Create client instance
  console.log('\n1. Creating FastSet client...')
  const client = FastsetClient.create({
    env: 'testnet',
    chain: 'fastset',
  })
  console.log(`   Environment: ${client.getConfig().env}`)
  console.log(`   Chain: ${client.getConfig().chain}`)
  console.log(`   Validator URL: ${client.getConfig().validatorUrl}`)

  // Create and manage wallets
  console.log('\n2. Creating and managing wallets...')
  const wallet1 = client.createWallet('wallet1')
  const wallet2 = client.createWallet('wallet2')
  console.log(`   Wallet 1 Address: ${wallet1.getAddressBase64()}`)
  console.log(`   Wallet 2 Address: ${wallet2.getAddressBase64()}`)
  console.log(`   Available wallets: ${client.listWallets().join(', ')}`)

  // Account operations
  console.log('\n3. Account operations...')
  try {
    const balance1 = await client.getBalance(wallet1.getAddressBase64())
    const balance2 = await client.getBalance(wallet2.getAddressBase64())
    console.log(`   Wallet 1 Balance: ${balance1}`)
    console.log(`   Wallet 2 Balance: ${balance2}`)

    const nonce1 = await client.getNextNonce(wallet1.getAddressBase64())
    console.log(`   Wallet 1 Next Nonce: ${nonce1}`)
  } catch (error) {
    console.log(`   Error getting account info: ${error}`)
  }

  // Faucet operations
  console.log('\n4. Funding from faucet...')
  try {
    const newBalance = await client.fundFromFaucet(wallet1.getAddressBase64())
    console.log(`   New balance after funding: ${newBalance}`)
  } catch (error) {
    console.log(`   Error funding from faucet: ${error}`)
  }

  // Transfer operations
  console.log('\n5. Transfer operations...')
  try {
    // Transfer using wallet name
    const transferResult1 = await client.transferWithWallet('wallet1', {
      recipient: wallet2.getAddressBase64(),
      amount: '100000000000000000', // 0.1 tokens
    })

    if (transferResult1.success) {
      console.log(`   Transfer successful! Hash: ${transferResult1.transactionHash}`)
    } else {
      console.log(`   Transfer failed: ${transferResult1.error}`)
    }

    // Transfer using private key
    const transferResult2 = await client.transfer({
      recipient: wallet1.getAddressBase64(),
      amount: '50000000000000000', // 0.05 tokens
      privateKey: wallet2.getPrivateKeyHex(),
    })

    if (transferResult2.success) {
      console.log(`   Transfer with private key successful! Hash: ${transferResult2.transactionHash}`)
    } else {
      console.log(`   Transfer with private key failed: ${transferResult2.error}`)
    }
  } catch (error) {
    console.log(`   Error during transfers: ${error}`)
  }

  // Contract query operations
  console.log('\n6. Contract query operations...')
  try {
    // Example contract query (this would need a real contract address)
    const queryResult = await client.queryContract({
      contractAddress: wallet1.getAddressBase64(), // Using wallet address as example
      functionName: 'balanceOf',
      args: [wallet1.getAddressBase64()],
    })

    if (queryResult.success) {
      console.log(`   Query successful! Result: ${JSON.stringify(queryResult.result)}`)
    } else {
      console.log(`   Query failed: ${queryResult.error}`)
    }
  } catch (error) {
    console.log(`   Error during contract query: ${error}`)
  }

  // Utility operations
  console.log('\n7. Utility operations...')
  const addressHex = wallet1.getAddressHex()
  const addressBase64 = wallet1.getAddressBase64()

  console.log(`   Original Hex Address: ${addressHex}`)
  console.log(`   Original Base64 Address: ${addressBase64}`)

  // Parse and format addresses
  const parsedAddress = client.parseAddress(addressHex)
  const formattedHex = client.formatAddress(parsedAddress, 'hex')
  const formattedBase64 = client.formatAddress(parsedAddress, 'base64')

  console.log(`   Parsed and formatted Hex: ${formattedHex}`)
  console.log(`   Parsed and formatted Base64: ${formattedBase64}`)

  // Configuration management
  console.log('\n8. Configuration management...')
  const chainInfo = client.getChainInfo()
  console.log(`   Chain Info: ${JSON.stringify(chainInfo, null, 2)}`)

  // Update configuration
  client.updateConfig({ env: 'mainnet' })
  console.log(`   Updated environment: ${client.getConfig().env}`)

  // Direct wallet operations
  console.log('\n9. Direct wallet operations...')
  try {
    const accountInfo = await wallet1.getAccountInfo()
    console.log(`   Wallet 1 Account Info: ${JSON.stringify(accountInfo, null, 2)}`)

    const balance = await wallet1.getBalance()
    console.log(`   Wallet 1 Balance: ${balance}`)

    const nonce = await wallet1.getNextNonce()
    console.log(`   Wallet 1 Nonce: ${nonce}`)
  } catch (error) {
    console.log(`   Error with direct wallet operations: ${error}`)
  }

  console.log('\n✅ FastSet Client Example completed!')
}

// Run the example
example().catch(console.error)
