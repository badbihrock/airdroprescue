require('dotenv').config()
const wallets = require('./wallets')
const { ethers, BigNumber, Wallet, providers } = require('ethers')  // didin't use the ethers library much
const fs = require('fs');
const Web3 = require('web3')

let bestgasprice
let gasfee_ineth
let chainId

//SetupRPC connection. using websocket so it is direct and faster  
const web3 = new Web3(new Web3.providers.WebsocketProvider(process.env.ALCHEMY_SOCKET_ARB))

const explorer = 'https://arbiscan.io/tx/'

// Load contract ABIs
const retrieverABI = JSON.parse(fs.readFileSync('./ABIs/retriever.json', 'utf8'))
const claimABI = JSON.parse(fs.readFileSync('./ABIs/claim.json', 'utf8'))
const erc20ABI = JSON.parse(fs.readFileSync('./ABIs/erc20.json', 'utf8'))

//contract address
const rContractAddress = web3.utils.toChecksumAddress('0xEA107ABaE8C3086f7F938d22995aB1d66609229f')
const claimContractAddress = web3.utils.toChecksumAddress('0x67a24CE4321aB3aF51c2D0a4801c3E111D88C9d9')
const arbiTokenAddress = web3.utils.toChecksumAddress('0x912CE59144191C1204E64559FE8253a0e49E6548')

//referrer
const refererAddress = web3.utils.toChecksumAddress('address')

//Load keys
const retreiverPrivateKey = process.env.RETRIEVER_KEY
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
    gasfee_ineth = (100000 *  bestgasPGwei)/1000000000
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
    const retrieverBalance = await getBalance('retriever', retrieverWallet.address)

    if (retrieverBalance > gasfee_ineth) {

        for (let number = 1; number < (Object.keys(wallets).length); number++) {    //in a perfect world i should be able to run these in a loop, but the victim wallets have active gas sweepers on them

        //const number = 18  //use this is you want to make use of just one wallet
        console.log(number, 'trying ', wallets[number].name, 'wallet....address:', wallets[number].compromisedaddress, 'out of', (Object.keys(wallets).length - 9))
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
        const ethamount = '0.0025'
        const amount = web3.utils.toWei(ethamount, 'ether')
        console.log(wallets[number].tokendecimalAmount)
        const arbiAmount = await claimContract.methods.claimableTokens(victimWallet.address).call() //figure out the calimable amount

        //Have to create the transactions here and do the necessry RPC/Provider requests so that we have less requests and maximum speed when sending requests
        //Get nonces
        const retrieverNonce = await web3.eth.getTransactionCount(retrieverWallet.address)
        const victimNonce = await web3.eth.getTransactionCount(victimWallet.address)

        //Create & Sign eth transfer transaction
        const rdata = retrieverContract.methods.transfer(victimWallet.address, amount).encodeABI()
        const rtx = { from: retrieverWallet.address, to: rContractAddress, nonce: retrieverNonce, data: rdata, gas: 100000, gasPrice: bestgasprice }
        //const rtx = { from: retrieverWallet.address, to: victimWallet.address, nonce: retrieverNonce, value: amount, gas: 100000, gasPrice: bestgasprice } //if you want to just send directly to the victim wallet
        const rsignedTX = await web3.eth.accounts.signTransaction(rtx, retreiverPrivateKey)

        //Create & Sign Token Claim transaction
        const vdata = claimContract.methods.claim().encodeABI()
        const vtx = { from: victimWallet.address, to: claimContractAddress, nonce: victimNonce, gas: 100000, gasPrice: bestgasprice, data: vdata, chainId: chainId }
        const vsignedTX = await web3.eth.accounts.signTransaction(vtx, victimPrivateKey)

        //Create & Sign Token Transfer transaction
        console.log('amount to claim and send', arbiAmount)
        const resdata = arbiContract.methods.transferFrom(victimWallet.address, retrieverWallet.address, arbiAmount).encodeABI()
        const restx = { from: retrieverWallet.address, to: arbiTokenAddress, nonce: retrieverNonce+1, gas: 100000, gasPrice: bestgasprice, data: resdata, chainId: chainId }
        const ressignedTX = await web3.eth.accounts.signTransaction(restx, retreiverPrivateKey)

        //Send signed transactions serially
        try { //no error handlers on the serailized sendtransactions so i can just handle it with the try catch
            await web3.eth.sendSignedTransaction(rsignedTX['rawTransaction']).on('transactionHash', async function(hash){
                console.log('sent', ethamount, 'eth for operation...transaction hash:', hash)
                  await web3.eth.sendSignedTransaction(vsignedTX['rawTransaction']).on('transactionHash', async function(hash){console.log('claiming tokens...transaction hash:', hash)
                      console.log('claimed tokens!')
                        await web3.eth.sendSignedTransaction(ressignedTX['rawTransaction']).on('transactionHash', async function(hash){console.log('transaction hash:', hash)})
                        .once('receipt', async function(receipt){ console.log('tokens sent, mission successful!') })

                    //send funds to victim's new address
                    victimAmount = web3.utils.toBN(arbiAmount).mul(web3.utils.toBN('8')).div(web3.utils.toBN('10')).toString();
                    await sendTokens(retrieverWallet.address, wallets[number].newaddress, victimAmount, retreiverPrivateKey, 'victim new address').catch(error => { console.log('error:', error)})

                    //send funds to referer's address, if there is one for this victim
                    if (wallets[number].referralFee) {
                        refererAmount = web3.utils.toBN(arbiAmount).mul(web3.utils.toBN('5')).div(web3.utils.toBN('100')).toString();
                        await sendTokens(retrieverWallet.address, refererAddress, refererAmount, retreiverPrivateKey, 'referer address').catch(error => { console.log('error:', error)})
                        process.exit(0)
                    }
                })
            })
            } catch (e) {
                console.log('error:', e)
                const arbalance = await arbiContract.methods.balanceOf(victimWallet.address)
                if (Number(arbalance) > 0) { transferTokens().catch(error => { console.log('error:', error)}) }
        }
    }  //loop end
    } else {
        console.log('not enough ETH in retreiver wallet!')
        return false
    }
    return true;
}


const sendTokens = async (sender, recipient, amount, senderKey, owner) => {
    if (!gasfee_ineth) await setGas()
    const tokenBalance = await arbiContract.methods.balanceOf(sender).call()
    if (Number(tokenBalance) > 0 ){
        console.log('tokens available')
        recipient = web3.utils.toChecksumAddress(recipient)
        const nonce = await web3.eth.getTransactionCount(sender)
        const data = arbiContract.methods.transfer(recipient, amount).encodeABI()
        const tx = { from: sender, to: arbiTokenAddress, nonce: nonce, gas: 250000, gasPrice: bestgasprice, data: data, chainId: chainId }
        const signedTX = await web3.eth.accounts.signTransaction(tx, senderKey)
        await web3.eth.sendSignedTransaction(signedTX['rawTransaction']).on('transactionHash', function(hash){console.log('sending tokens to '+owner+'...transaction hash:', hash)})
        .once('receipt', async function(receipt){ console.log('tokens sent, mission successful!') }).on('error', function (error) { console.log('error:', error) })
        return true
    } else {
        console.log('ARB token has already been drained!')
        return false
    }
}

//fallback function incase the whole token amount isn't succesfully sent in the start function
const transferTokens = async () => {

    if (!gasfee_ineth) await setGas()
    const arbalance = await arbiContract.methods.balanceOf(victimWallet.address).call()
    if (Number(arbalance) > 0 ){
        console.log('tokens available')
        const resnonce = await web3.eth.getTransactionCount(victimWallet.address)
        const resdata = arbiContract.methods.transferFrom(victimWallet.address, retrieverWallet.address, arbiAmount).encodeABI()
        const restx = { from: victimWallet.address, to: arbiTokenAddress, nonce: resnonce, gas: 1000000, gasPrice: bestgasprice, data: resdata, chainId: chainId }
        const ressignedTX = await web3.eth.accounts.signTransaction(restx, retreiverPrivateKey)
        await web3.eth.sendSignedTransaction(ressignedTX['rawTransaction']).on('transactionHash', function(hash){console.log('sending tokens...transaction hash:', hash)})
        .once('receipt', async function(receipt){ console.log('tokens sent, mission successful!') }).on('error', function (error) { console.log('error:', error) })
        return true
    } else {
        console.log('ARB token has already been drained!')
        return false
    }

}

start()
//sendTokens()
//transferTokens()