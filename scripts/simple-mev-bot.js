// 1. Import everything
const { BigNumber, ethers, providers, Wallet } = require('ethers');
const { FlashbotsBundleProvider, FlashbotsBundleResolution } = require('@flashbots/ethers-provider-bundle')
const fetch = require('node-fetch')
const fs = require('fs');
require('dotenv').config()

const erc20ABI = JSON.parse(fs.readFileSync('./ABIs/erc20.json', 'utf8'))

/*
Mainnet
const provider = new providers.JsonRpcProvider('https://eth-mainnet.g.alchemy.com/v2/cmHEQqWnoliAP0lgTieeUtwHi0KxEOlh')
const wsProvider = new providers.WebSocketProvider('wss://eth-mainnet.g.alchemy.com/v2/cmHEQqWnoliAP0lgTieeUtwHi0KxEOlh')
*/

// 2. Setup a standard provider in goerli
const purl = process.env.INFURA_GEORLI_ENDPOINT

//const provider = new providers.JsonRpcProvider(purl)
const provider = new providers.WebSocketProvider(process.env.ALCHEMY_SOCKET_ARB)
/*const wsProvider = new providers.WebSocketProvider(
	'wss://eth-goerli.g.alchemy.com/v2/wOB3tqbHfs_RGAeFJqomylXrUOH_MrVT'
)*/

// 3. The unique ID for flashbots to identify you and build trust over time
const authSigner = new Wallet( process.env.PRIVATE_KEY, provider )
const bundlerSigner = new Wallet( process.env.BUNDLER_SIGNER, provider )
// The address of the authSigner is 0x09Dad4e56b1B2A7eeD9C41691EbDD4EdF0D80a46

const start = async () => {
	// 4. Create the flashbots provider
	const flashbotsProvider = await FlashbotsBundleProvider.create(
		provider,
		bundlerSigner
		//'https://relay-goerli.epheph.com/'
	)

	const GWEI = BigNumber.from(10).pow(9)
	const LEGACY_GAS_PRICE = GWEI.mul(31)
	const PRIORITY_FEE = GWEI.mul(100)
	const blockNumber = await provider.getBlockNumber()
	const block = await provider.getBlock(blockNumber)
	const chainId = await authSigner.getChainId()
	console.log('chainId', chainId)
	const maxBaseFeeInFutureBlock =
		FlashbotsBundleProvider.getMaxBaseFeeInFutureBlock(block.baseFeePerGas, 6) // 100 blocks in the future

	console.log('maxBaseFeeInFutureBlock', String(maxBaseFeeInFutureBlock), String(maxBaseFeeInFutureBlock.div('100000000000000000')))

	const amountInEther = '0.0002'

	// 5. Setup the transactions to send and sign
	const tokenAddress = ethers.utils.getAddress('0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9');
    const tokenContract = new ethers.Contract(tokenAddress, erc20ABI, provider);
    const transfer = await tokenContract.populateTransaction.transfer('0xEA107ABaE8C3086f7F938d22995aB1d66609229f', '5000000');
	console.log('we got here')
	const nonce = await authSigner.getTransactionCount()
	const txBundle = [
		{ // Both transactions are the same but one is type 1 and the other type 2 after the gas changes
			signer: authSigner,
			transaction: {
				to: '0xEA107ABaE8C3086f7F938d22995aB1d66609229f',
				type: 2,
				maxFeePerGas: PRIORITY_FEE.add(maxBaseFeeInFutureBlock),
				maxPriorityFeePerGas: PRIORITY_FEE,
				chainId: chainId,
				value: ethers.utils.parseEther(amountInEther),
				gasLimit: ethers.utils.hexlify(800000),
				nonce: nonce
			},
		},
		// we need this second tx because flashbots only accept bundles that use at least 42000 gas.
		{
			signer: authSigner,
			transaction: {
				to: tokenAddress,
				gasPrice: LEGACY_GAS_PRICE,
				data: transfer.data,
				//value: ethers.utils.hexlify(0),
				gasLimit: ethers.utils.hexlify(800000),
				nonce: nonce+1,
				chainId: chainId
			},
		},
	]
	console.log(txBundle)
	const signedTransactions = await flashbotsProvider.signBundle(txBundle)

	// 6. We run a simulation for the next block number with the signed transactions
	console.log(new Date())
    console.log('Starting to run the simulation...')
	const simulation = await flashbotsProvider.simulate(
		signedTransactions,
		blockNumber + 1,
	)
	console.log(JSON.stringify(simulation, null, 2))
	console.log(new Date())

	// 7. Check the result of the simulation
	if (simulation.firstRevert || simulation.error) {
		console.log(`Simulation Error: ${simulation.firstRevert.error}`)
		console.log(simulation.error)
	} else {
		console.log(
			`Simulation Success: ${blockNumber}}`
		)
	}

	// 8. Send 10 bundles to get this working for the next blocks in case flashbots doesn't become the block producer
	for (var i = 1; i <= 10; i++) {
		const bundleSubmission = await flashbotsProvider.sendRawBundle(
			signedTransactions,
			blockNumber + i
		)
		console.log('bundle submitted, waiting', bundleSubmission.bundleHash)

		const waitResponse = await bundleSubmission.wait()
		console.log(`Wait Response: ${FlashbotsBundleResolution[waitResponse]}`)
		if (
			waitResponse === FlashbotsBundleResolution.BundleIncluded ||
			waitResponse === FlashbotsBundleResolution.AccountNonceTooHigh
		) {
            console.log('Bundle included!')
			process.exit(0)
		} else {
			console.log({
				bundleStats: await flashbotsProvider.getBundleStats(
					simulation.bundleHash,
					blockNumber + 1,
				),
				userStats: await flashbotsProvider.getUserStats(),
			})
		}
	}
	console.log('bundles submitted')
}

start()