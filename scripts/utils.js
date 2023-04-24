require('dotenv').config()
const wallets = require('./wallets')
const { ethers, BigNumber, Wallet, providers } = require('ethers')
let sum = 0
let total = 0
let number = 0
let psum = 0
let pSum = 0

const provider = new providers.WebSocketProvider(process.env.ALCHEMY_SOCKET_ARB)

for (const wallet in wallets) {
    console.log('trying ', wallets[wallet].name, 'wallet, number:', wallet )
    try {
        if (wallets[wallet].seedphrase) {
        //use the seedphrase
        victimWallet = new Wallet((Wallet.fromMnemonic(wallets[wallet].seedphrase)).privateKey)
        console.log('same wallet from private key', (Wallet.fromMnemonic(wallets[wallet].seedphrase)).privateKey)
    } else {
        //use privatekey
        victimWallet = new Wallet(wallets[wallet].privatekey)
        console.log('wallet from private key', victimWallet)
    }} catch (e) { console.log('error:', e) }
}

for (const wallet in wallets) {
    //for (let wallet = 1; wallet < (Object.keys(wallets).length); wallet++) {
    //console.log(wallet)
    if (wallets[wallet].referralFee) {
        total += wallets[wallet].tokenAmount
    if (wallets[wallet].status){
        sum += wallets[wallet].tokenAmount
        //console.log(wallets[wallet].tokenAmount, 'ARB rescued for user:', wallets[wallet].name, 'to new address: ' + wallets[wallet].newaddress, '✅')
        console.log(wallets[wallet].tokenAmount, 'ARB rescued for user:', wallets[wallet].name, 'to new address ✅')
        
        number++
        

    }
}
     else {
        psum += wallets[wallet].tokenAmount
        if (wallets[wallet].status) {
            pSum += wallets[wallet].tokenAmount
            console.log('reference: ' + wallets[wallet].referralFee)
            console.log('pSum: ', pSum)
        }
    }
  /* try {
        if (wallets[wallet].seedphrase) {
        //use the seedphrase
        victimWallet = new Wallet((Wallet.fromMnemonic(wallets[wallet].seedphrase)).privateKey)
        console.log('same wallet from private key', victimWallet, (Wallet.fromMnemonic(wallets[wallet].seedphrase)).privateKey)
    } else {
        //use privatekey
        victimWallet = new Wallet(wallets[wallet].privatekey)
        console.log('wallet from private key', victimWallet)
    }} catch (e) { console.log('error:', e) }   */
}

console.log('number of wallets to claim from:', (Object.keys(wallets).length))
console.log('total number of tokens to claim:', total, 'ARB')
//console.log('projected earnings (dev):', ((total * 0.15)+(psum*0.2)), 'ARB')
//console.log('projected earnings (referer):', (sum * 0.05), 'ARB')


console.log('total number sussesfully claimed from:', number)
console.log('total number of tokens claim:', sum, 'ARB')
//console.log('amount made (for dev):', ((sum * 0.15)+(pSum*0.2)), 'ARB')
//console.log('amount made (for referer):', (sum * 0.05), 'ARB')




/*
for (const wallet in wallets) {
    console.log('trying ', wallets[wallet].name, 'wallet')
    try {
        if (wallets[wallet].seedphrase) {
        //use the seedphrase
        victimWallet = new Wallet((Wallet.fromMnemonic(wallets[wallet].seedphrase)).privateKey)
        console.log('same wallet from private key', victimWallet)
    } else {
        //use privatekey
        victimWallet = new Wallet(wallets[wallet].privatekey)
        console.log('wallet from private key', victimWallet)
    }} catch (e) { console.log('error:', e) }
}

*/