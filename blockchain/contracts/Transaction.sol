// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title Transaction
 * @dev A Solidity contract for managing transactions in Kudos on Solana (via Solang/Neon EVM).
 * Handles payments for capsule purchases, competition entries, and social space fees.
 */
contract Transaction is Ownable {
    using Counters for Counters.Counter;

    // Counter for transaction IDs
    Counters.Counter private _transactionIdCounter;

    // Struct to store transaction details
    struct TransactionRecord {
        uint256 id;             // Unique transaction ID
        address sender;         // Sender's address
        address receiver;       // Receiver's address
        uint256 amount;         // Amount in wei (or smallest unit)
        string purpose;         // Purpose of the transaction (e.g., "Capsule Purchase")
        uint256 timestamp;      // Unix timestamp of the transaction
        string capsuleId;       // Optional: ID of the associated capsule
        bool completed;         // Whether the transaction is finalized
    }

    // Mapping from transaction ID to record
    mapping(uint256 => TransactionRecord) public transactions;

    // Commission rate (e.g., 5% = 500 basis points)
    uint256 public commissionRate = 500; // Basis points (10000 = 100%)
    address public commissionWallet;     // Wallet to receive commissions

    // Event emitted when a transaction is initiated
    event TransactionInitiated(
        uint256 indexed id,
        address indexed sender,
        address indexed receiver,
        uint256 amount,
        string purpose,
        string capsuleId
    );

    // Event emitted when a transaction is completed
    event TransactionCompleted(uint256 indexed id, uint256 commission);

    /**
     * @dev Constructor initializing the contract.
     * @param initialOwner Address of the contract owner (e.g., Kudos founder).
     * @param _commissionWallet Address to receive commissions.
     */
    constructor(address initialOwner, address _commissionWallet) Ownable(initialOwner) {
        commissionWallet = _commissionWallet;
        _transactionIdCounter.increment(); // Start IDs at 1
    }

    /**
     * @dev Initiate a transaction by sending funds from sender to receiver.
     * @param receiver Address to receive the funds.
     * @param purpose Description of the transaction purpose.
     * @param capsuleId Optional ID of the associated capsule.
     */
    function initiateTransaction(address receiver, string memory purpose, string memory capsuleId) external payable {
        require(msg.value > 0, "Transaction: Amount must be greater than 0");
        require(receiver != address(0), "Transaction: Invalid receiver address");

        uint256 transactionId = _transactionIdCounter.current();
        _transactionIdCounter.increment();

        transactions[transactionId] = TransactionRecord({
            id: transactionId,
            sender: msg.sender,
            receiver: receiver,
            amount: msg.value,
            purpose: purpose,
            timestamp: block.timestamp,
            capsuleId: capsuleId,
            completed: false
        });

        emit TransactionInitiated(transactionId, msg.sender, receiver, msg.value, purpose, capsuleId);
    }

    /**
     * @dev Complete a transaction, transferring funds and commission.
     * @param transactionId ID of the transaction to complete.
     */
    function completeTransaction(uint256 transactionId) external onlyOwner {
        TransactionRecord storage tx = transactions[transactionId];
        require(tx.id != 0, "Transaction: Invalid transaction ID");
        require(!tx.completed, "Transaction: Already completed");

        uint256 commission = (tx.amount * commissionRate) / 10000;
        uint256 netAmount = tx.amount - commission;

        // Mark as completed
        tx.completed = true;

        // Transfer commission to commission wallet
        (bool commissionSent, ) = commissionWallet.call{value: commission}("");
        require(commissionSent, "Transaction: Failed to send commission");

        // Transfer net amount to receiver
        (bool receiverSent, ) = tx.receiver.call{value: netAmount}("");
        require(receiverSent, "Transaction: Failed to send funds to receiver");

        emit TransactionCompleted(transactionId, commission);
    }

    /**
     * @dev Get transaction details by ID.
     * @param transactionId ID of the transaction.
     * @return TransactionRecord struct with details.
     */
    function getTransaction(uint256 transactionId) external view returns (TransactionRecord memory) {
        require(transactions[transactionId].id != 0, "Transaction: Invalid transaction ID");
        return transactions[transactionId];
    }

    /**
     * @dev Set the commission rate (in basis points, e.g., 500 = 5%).
     * @param newRate New commission rate.
     */
    function setCommissionRate(uint256 newRate) external onlyOwner {
        require(newRate <= 10000, "Transaction: Rate must be <= 100%");
        commissionRate = newRate;
    }

    /**
     * @dev Set the commission wallet address.
     * @param newWallet New commission wallet address.
     */
    function setCommissionWallet(address newWallet) external onlyOwner {
        require(newWallet != address(0), "Transaction: Invalid wallet address");
        commissionWallet = newWallet;
    }

    /**
     * @dev Withdraw any stuck funds (emergency use).
     */
    function withdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "Transaction: No funds to withdraw");
        (bool sent, ) = owner().call{value: balance}("");
        require(sent, "Transaction: Failed to withdraw funds");
    }

    // Receive function to accept direct ETH/SOL payments
    receive() external payable {}
}