// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

contract AiLogger {
    event TransactionLogged(
        string indexed id,
        string indexed txType,
        string sender,
        string receiver,
        string payload,
        uint256 timestamp
    );

    function logTransaction(
        string memory id,
        string memory txType,
        string memory sender,
        string memory receiver,
        string memory payload
    ) public {
        emit TransactionLogged(id, txType, sender, receiver, payload, block.timestamp);
    }
}
