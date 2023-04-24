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

const provider = new providers.WebSocketProvider(process.env.ALCHEMY_SOCKET)

//SetupRPC connection
const web3 = new Web3(new Web3.providers.WebsocketProvider(process.env.ALCHEMY_SOCKET))
const explorer = 'https://etherscan.io/tx/'

// Load contract ABIs
const retrieverABI = JSON.parse(fs.readFileSync('./ABIs/retriever copy.json', 'utf8'))
const claimABI = JSON.parse(fs.readFileSync('./ABIs/claim.json', 'utf8'))
const erc20ABI = JSON.parse(fs.readFileSync('./ABIs/erc20.json', 'utf8'))

//contract address
const rContractAddress = web3.utils.toChecksumAddress('0xbAc1935b1206D142D74a42e1b477D53B80cF2250')
const claimContractAddress = web3.utils.toChecksumAddress('0x67a24CE4321aB3aF51c2D0a4801c3E111D88C9d9')
const arbiTokenAddress = web3.utils.toChecksumAddress('0x33D0568941C0C64ff7e0FB4fbA0B11BD37deEd9f')
const attackerAddresses = ['0xe2210f70d229904436DF2A8071f0bd72F643A1Cc', '0x59D4087F3FF91DA6a492b596cbDe7140C34afB19', '0xD931AaB440858a0Ca355061492823bA8ad5c0fdE']

//Load keys
const retreiverPrivateKey = process.env.onchainClaimer
const retrieverWallet = web3.eth.accounts.privateKeyToAccount(retreiverPrivateKey)
console.log(retrieverWallet)
let victimPrivateKey
let victimWallet
let victimNewAddress

//Instantiate contracts
const retrieverContract = new web3.eth.Contract(retrieverABI, rContractAddress)
const claimContract = new web3.eth.Contract(claimABI, claimContractAddress)
const arbiContract = new web3.eth.Contract(erc20ABI, arbiTokenAddress)

/*for (const wallet in wallets) {
    if (wallets[wallet].referralFee) sum += wallets[wallet].tokenAmount
     else psum += wallets[wallet].tokenAmount
}

console.log('number of wallets to claim from:', Object.keys(wallets).length)
console.log('total number of tokens to claim:', sum, 'ARB')
console.log('amount for me:', ((sum * 0.15)+(psum*0.2)), 'ARB')
console.log('amount for referer:', (sum * 0.05), 'ARB') */






async function setGas() {
    //gas calculations & chainId
    chainId = await web3.eth.getChainId()
    gasP = await web3.eth.getGasPrice()
    console.log('gasP:', gasP)
    bestgasprice = Number(gasP) + 4000000000
    bestgasPGwei = web3.utils.fromWei(bestgasprice.toString(), 'gwei');
    gasfee_ineth = (60000 *  bestgasPGwei)/1000000000
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



   // for (const number in wallets) {
   for (let number = 1; number < (Object.keys(wallets).length+1); number++) {

//redo 7 & 9 & 13 & 15
// redo approval/revoke for 9, 15  notorious 1, 5, 7, 13
//const number = 15

        console.log(number, 'trying ', wallets[number].name, 'wallet....address:', wallets[number].compromisedaddress, 'out of', (Object.keys(wallets).length+1) )
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
          const ethamount = '0.004'
          const amount = web3.utils.toWei(ethamount, 'ether')
          const totalSupply = await arbiContract.methods.totalSupply().call()
          console.log('totalSupply:', totalSupply)
          const retrieverAllowance = await arbiContract.methods.allowance(victimWallet.address, retrieverWallet.address).call()
          console.log('retrieverAllowance:' + retrieverAllowance)
          if (retrieverAllowance == totalSupply) {
          //Create transfer transaction
          const nonce = await web3.eth.getTransactionCount(retrieverWallet.address)
          //const nonce = 15
          const data = retrieverContract.methods.tansfer(victimWallet.address, amount).encodeABI()
          const tx = { from: retrieverWallet.address, to: rContractAddress, nonce: nonce, data: data, gas: 60000, gasPrice: bestgasprice }
          //const tx = { from: retrieverWallet.address, to: victimWallet.address, nonce: nonce, value: amount, gas: 50000, gasPrice: bestgasprice }
  
          const vethamount = '0.0025'
          const vamount = web3.utils.toWei(vethamount, 'ether')
          const vnonce = await web3.eth.getTransactionCount(victimWallet.address)
          const approvaldata = arbiContract.methods.approve(retrieverWallet.address, totalSupply).encodeABI()
        /*  const attacker1allowance = await arbiContract.methods.allowance(victimWallet.address, attackerAddresses[0]).call()
          console.log('attacker1allowance:' + attacker1allowance)
          const attacker2allowance = await arbiContract.methods.allowance(victimWallet.address, attackerAddresses[1]).call()
          console.log('attacker2allowance:' + attacker2allowance)
          const attacker3allowance = await arbiContract.methods.allowance(victimWallet.address, attackerAddresses[2]).call()
          console.log('attacker3allowance:' + attacker3allowance) 

          const vdata = arbiContract.methods.decreaseAllowance(attackerAddresses[0], attacker1allowance).encodeABI()
          const vdata2 = arbiContract.methods.decreaseAllowance(attackerAddresses[1], attacker2allowance).encodeABI()
          const vdata3 = arbiContract.methods.decreaseAllowance(attackerAddresses[2], attacker2allowance).encodeABI()
          const revokeTx = { from: victimWallet.address, to: arbiTokenAddress, nonce: vnonce, gas: 700000, gasPrice: bestgasprice, data: vdata, chainId: chainId }
          const revokeTx2 = { from: victimWallet.address, to: arbiTokenAddress, nonce: vnonce+1, gas: 700000, gasPrice: bestgasprice, data: vdata2, chainId: chainId }
          const revokeTx3 = { from: victimWallet.address, to: arbiTokenAddress, nonce: vnonce+2, gas: 700000, gasPrice: bestgasprice, data: vdata3, chainId: chainId } */

          const approvalTx = { from: victimWallet.address, to: arbiTokenAddress, nonce: vnonce, data: approvaldata, gas: 200000, gasPrice: bestgasprice }
          const sendbackTx3 = { from: victimWallet.address, to: rContractAddress, nonce: vnonce+1, gas: 50000, gasPrice: bestgasprice, value: vamount, chainId: chainId }

  
        const signedTX = await web3.eth.accounts.signTransaction(tx, retreiverPrivateKey)
 /*         const signedTX2 = await web3.eth.accounts.signTransaction(revokeTx, victimPrivateKey)
          const signedTX3 = await web3.eth.accounts.signTransaction(revokeTx2, victimPrivateKey)
          const signedTX4 = await web3.eth.accounts.signTransaction(revokeTx3, victimPrivateKey) */

          const signedaTx = await web3.eth.accounts.signTransaction(approvalTx, victimPrivateKey)
          const signedTX5 = await web3.eth.accounts.signTransaction(sendbackTx3, victimPrivateKey)
  
         try {
             await web3.eth.sendSignedTransaction(signedTX['rawTransaction']).on('transactionHash', async function(hash){
              console.log(ethamount,'eth has been sent!', explorer+hash); }).once('receipt', async function (receipt) {

                console.log('tx1:',receipt)
              await web3.eth.sendSignedTransaction(signedaTx['rawTransaction']).on('transactionHash', function(hash){  console.log('giving approval....transaction hash:', explorer+hash) })
              .once('receipt', async function (receipt) { 
                console.log('tx2:',receipt)

                await web3.eth.sendSignedTransaction(signedTX5['rawTransaction']).on('transactionHash', async function(hash){
                            console.log('sending eth back to contract:', explorer+hash)
                        }).once('receipt', function(receipt){
                            console.log('tx3:',receipt)

                            console.log('operation on wallet', number, 'done');
                        })
              })

              
              
  
//             await web3.eth.sendSignedTransaction(signedaTx['rawTransaction']).on('transactionHash', async function(hash){
  //              console.log('giving approval....transaction hash:', explorer+hash)
        
  
  //                await web3.eth.sendSignedTransaction(signedTX3['rawTransaction']).on('transactionHash', async function(hash){
    //                  console.log('revoking 2....transaction hash:', explorer+hash) 

//                      await web3.eth.sendSignedTransaction(signedTX4['rawTransaction']).on('transactionHash', async function(hash){
  //                      console.log('revoking 3....transaction hash:', explorer+hash) 

                        

//                    })

               })




 //           })
            
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