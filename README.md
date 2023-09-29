simple repo to try retrieving possible airdrops from compromised wallets with active gas sweepers. Used during arbitrum airdrop in March 2023.
(note this ia a very old repo and sweepers and bots are way more advanced now)
very manual process, so a lot of scripts you gotta run manually, and not enough error handling and fallbacks.

## Installation
1. Clone the repository.
2. Run `npm install`.

## Usage
1. wallets.js contains a dictionary of the compromised wallet address, key/phrase, recoery wallet address and the eligible amount of tokens
(these were sent in by victims via twitter/telegram/discord). because these keys are already compromised, and enviromnet method of storing them isn't necessary.
we just need to claim aridrop tokens.
2. utils is simply used to sift through through the wallets script to calculate proposed amoutn of tokens to recover and just see where you're at with stuff.
3. utilsApproval helps set approve to the airdrop token to my wallets.
4. utilslAlowance is to revoke allowances to attack wallet(s) for the airdrop token
5. since most sweepers only checking incoming TXs, my strategy was to send eth through contracts since those are internal transactions. some of the sweepers where checking balances per block so this was about 80% efficient, however when run/retried back to back was somwhat successful. The claims contract is a basic solidity contract for holding and sending eth across different wallets, with axcess control checks for only owner to carry these transactions; withdraw, send, renounce ownership.
6. arbairdrop script carried out the rescue operation, sending 80% of the tokens rescued to appropriate wallets, 15% to me and 5% to the referer (who brought the victims to me)

## Contributing
If you'd like to contribute, please fork the repository and create a pull request. Also open to comments and suggestions

PS: I've greatly imporved my coding and approach to it since this project. This is pretty old.