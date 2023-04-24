//SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.0;

import "./ERC20/ERC20.sol";
 // or import "@openzeppelin/contracts/token/ERC20/ERC20.sol"; for Remix

contract Claims {
    address private owner;
    ERC20 public token;

    constructor() {
        owner = msg.sender;
    }

    receive () external payable {
        // Fallback function to accept ETH payments to the contract
    }

    function transferToSelf() public {
        require(owner == msg.sender, "Only the owner can withdraw");
        require(address(this).balance > 0, "No ETH available");
        payable(msg.sender).transfer(address(this).balance);
    } 

    function transfer(address payable recipient, uint256 value) public {
        require(owner == msg.sender, "Only the owner can send");
        require(recipient != address(0), "Invalid recipient address");
        require(address(this).balance > 0, "No ETH available");
        recipient.transfer(value);
    }

    function transferTokenToSelf(address tokenAddress) public {
        require(msg.sender == owner, "Only the owner can withdraw tokens");
        token = ERC20(tokenAddress);
        uint256 tokenBalance = token.balanceOf(address(this));
        require(tokenBalance >= 0, "Not enough tokens available in the contract");
        token.transfer(payable(msg.sender), tokenBalance);
    }

    function getOwner() public view returns (address) {
        return owner;
    }

    function transferOwnership(address newOwner) public {
        require(msg.sender == owner, "Only the current owner can transfer ownership");
        owner = newOwner;
    }
}

