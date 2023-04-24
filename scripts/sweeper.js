require('dotenv').config()
const { ethers } = require("ethers");
const { BigNumber, utils } = ethers
const privateKeys = require('./keys')
const provider = new ethers.providers.WebSocketProvider(process.env.ANKR_SOCKET)
const sweeperVault = 'address'


const run = async () => {
  provider.on("block", async (blockNumber) => {
      console.log('Listening new block', blockNumber, 'waiting..');

      for (let i = 0; i < privateKeys.length; i++) {
        const _target = new ethers.Wallet(privateKeys[i]);
        const target = _target.connect(provider);
        const chainId = await target.getChainId()

              const currentBalance = await target.getBalance();
              console.log(target.address, 'balance in eth: ', ethers.utils.formatEther(currentBalance))
              const gasLimit = 21000
              const feeData = await provider.getFeeData();
              const maxGasFee = BigNumber.from(gasLimit).mul(feeData.maxFeePerGas)
              console.log('gas fee in eth: ', ethers.utils.formatEther(maxGasFee))
              console.log(ethers.utils.formatEther(currentBalance.sub(maxGasFee)))
              if (currentBalance.sub(maxGasFee).toString() > 0) {
                console.log("NEW ACCOUNT WITH ETH!");
                  const tx = {
                    to: sweeperVault,
                    nonce: await target.getTransactionCount(),
                    value: currentBalance.sub(maxGasFee),
                    chainId: chainId,
                    gasPrice: feeData.maxFeePerGas,
                    gasLimit: gasLimit,
                  }

                  try {
                    await target.sendTransaction(tx);
                    console.log(`Success! transferred --> ${ethers.utils.formatEther(currentBalance.sub(maxGasFee))} ETH to VAULT ${sweeperVault} ✅`);
                  }
                  catch (e) {
                      console.log(`error: ${e}`);
                  }

              }
      }

    });


  }

run()