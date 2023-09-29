require('dotenv').config()
const wallets = require('./wallets')
const { ethers, BigNumber, Wallet, providers } = require('ethers')
const fs = require('fs');
const Web3 = require('web3')

let bestgasprice
let gasfee_ineth
let chainId
let sum = 0
let psum = 0

const provider = new providers.WebSocketProvider(process.env.ALCHEMY_SOCKET_ARB)

//SetupRPC connection
const web3 = new Web3(new Web3.providers.WebsocketProvider(process.env.ALCHEMY_SOCKET_ARB))
const explorer = 'https://arbiscan.io/tx/'

// Load contract ABIs
const retrieverABI = JSON.parse(fs.readFileSync('./ABIs/retriever.json', 'utf8'))
const claimABI = JSON.parse(fs.readFileSync('./ABIs/claim.json', 'utf8'))
const erc20ABI = JSON.parse(fs.readFileSync('./ABIs/erc20.json', 'utf8'))

//contract address
const rContractAddress = web3.utils.toChecksumAddress('0xEA107ABaE8C3086f7F938d22995aB1d66609229f')
const claimContractAddress = web3.utils.toChecksumAddress('0x67a24CE4321aB3aF51c2D0a4801c3E111D88C9d9')
const arbiTokenAddress = web3.utils.toChecksumAddress('0x9d2f299715d94d8a7e6f5eaa8e654e8c74a988a7')
const attackerAddresses = ['0xe2210f70d229904436DF2A8071f0bd72F643A1Cc', '0x59D4087F3FF91DA6a492b596cbDe7140C34afB19', '0xD931AaB440858a0Ca355061492823bA8ad5c0fdE']

//Load keys
const retreiverPrivateKey = process.env.RETRIEVER_KEY_ANON
const retrieverWallet = web3.eth.accounts.privateKeyToAccount(retreiverPrivateKey)
let victimPrivateKey
let victimWallet
let victimNewAddress

//Instantiate contracts
const retrieverContract = new web3.eth.Contract(retrieverABI, rContractAddress)
const claimContract = new web3.eth.Contract(claimABI, claimContractAddress)
const arbiContract = new web3.eth.Contract(erc20ABI, arbiTokenAddress)

async function setGas() {
    //gas calculations & chainId
    chainId = await web3.eth.getChainId()
    gasP = await web3.eth.getGasPrice()
    bestgasprice = Number(gasP) + 200000000
    bestgasPGwei = web3.utils.fromWei(bestgasprice.toString(), 'gwei');
    gasfee_ineth = (1000000 *  bestgasPGwei)/1000000000
    console.log('best gas price in Gwei: ' + bestgasPGwei, 'gasfee_ineth: ' + gasfee_ineth)
}

async function getBalance(owner, address) {
    const balance = await web3.eth.getBalance(address)
    const balance_ineth = Number(web3.utils.fromWei(balance, 'ether'))
    console.log(owner, 'balance_ineth:', balance_ineth)
    return balance_ineth
}

const start = async () => {
    await setGas()

    //Get retriever's balance
    const retrieverBalance = await getBalance('retiever', retrieverWallet.address)

    if (retrieverBalance > gasfee_ineth) {

    // for (const number in wallets) // -- you can use this but problem is it doesn't wait for special await actions necessary for most on chain interactions, unlike a counter loop
    for (let number = 1; number < (Object.keys(wallets)); number++) { //loop to run through all O
    //const number = 22 //set to number in the dictionary to target just one wallet, and just comment for loop
    //redo 7 & 9 & 13 & 15 -- my personal notes during the exercise
    // redo approval/revoke for 9, 15  notorious 1, 5, 7, 13 -- my personal notes during the exercise
        console.log(number, 'trying ', wallets[number].name, 'wallet....address:', wallets[number].compromisedaddress, 'out of', (Object.keys(wallets).length - 5) )
        try {
            if (wallets[number].seedphrase) {
            //use the seedphrase
            victimPrivateKey = Wallet.fromMnemonic(wallets[number].seedphrase).privateKey
            victimWallet = web3.eth.accounts.privateKeyToAccount(victimPrivateKey)
        } else {
            //use privatekey
            victimPrivateKey = wallets[number].privatekey
            victimWallet = web3.eth.accounts.privateKeyToAccount(victimPrivateKey)
        }
        victimNewAddress = web3.utils.toChecksumAddress(wallets[number].newaddress)
    } catch (e) { console.log('error:', e) }
            // Amount to transfer
            const ethamount = '0.0005'
            const amount = web3.utils.toWei(ethamount, 'ether')
            const totalSupply = await arbiContract.methods.totalSupply().call()
            console.log('totalSupply:', totalSupply)
            const retrieverAllowance = await arbiContract.methods.allowance(victimWallet.address, retrieverWallet.address).call()
            console.log('retrieverAllowance:' + retrieverAllowance)
            if (retrieverAllowance !== totalSupply) {
            //Create transfer transaction
            const nonce = await web3.eth.getTransactionCount(retrieverWallet.address)
            const data = retrieverContract.methods.transfer(victimWallet.address, amount).encodeABI()
            //const tx = { from: retrieverWallet.address, to: rContractAddress, nonce: nonce, data: data, gas: 700000, gasPrice: bestgasprice }
            const tx = { from: retrieverWallet.address, to: victimWallet.address, nonce: nonce, value: amount, gas: 1000000, gasPrice: bestgasprice }
    
            const vethamount = '0.0002'
            const vamount = web3.utils.toWei(vethamount, 'ether')
            const vnonce = await web3.eth.getTransactionCount(victimWallet.address)
            const approvaldata = arbiContract.methods.approve(retrieverWallet.address, totalSupply).encodeABI()
            const approvalTx = { from: victimWallet.address, to: arbiTokenAddress, nonce: vnonce, data: approvaldata, gas: 700000, gasPrice: bestgasprice }
            const sendbackTx3 = { from: victimWallet.address, to: retrieverWallet.address, nonce: vnonce+1, gas: 700000, gasPrice: bestgasprice, value: vamount, chainId: chainId }

    
            const signedTX = await web3.eth.accounts.signTransaction(tx, retreiverPrivateKey)
            const signedaTx = await web3.eth.accounts.signTransaction(approvalTx, victimPrivateKey)
            const signedTX5 = await web3.eth.accounts.signTransaction(sendbackTx3, victimPrivateKey)

         try { await web3.eth.sendSignedTransaction(signedTX['rawTransaction']).on('transactionHash', async function(hash){
              console.log(ethamount,'eth has been sent!', explorer+hash); await web3.eth.sendSignedTransaction(signedaTx['rawTransaction']).on('transactionHash', async function(hash){  console.log('giving approval....transaction hash:', explorer+hash)
                        await web3.eth.sendSignedTransaction(signedTX5['rawTransaction']).on('transactionHash', async function(hash){
                            console.log('sending eth back to contract:', explorer+hash)
                        }).once('receipt', function(receipt){
                            console.log('operation on wallet', number, 'done');
                        })
//                    })
   //             })
            })
            })
            } catch(e){console.log("Error: ", e)}

             } else { console.log('approval for wallet', number, 'is right') }
}   //loop end
        } else {
        console.log('not enough ETH')
        return false
    }
    return true;
}

start()