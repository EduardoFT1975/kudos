// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title CapsuleNFT
 * @dev An ERC-721 NFT contract for Kudos capsules on Solana (via Solang/Neon EVM).
 * Represents multidimensional capsules with content, geolocation, time, themes, and climatology.
 */
contract CapsuleNFT is ERC721, Ownable {
    using Counters for Counters.Counter;
    using Strings for uint256;

    // Counter for token IDs
    Counters.Counter private _tokenIdCounter;

    // Struct to store capsule metadata
    struct Capsule {
        string content;         // Text or description of the capsule
        int256 latitude;        // Geolocation: latitude (scaled to integer, e.g., 419028 = 41.9028°)
        int256 longitude;       // Geolocation: longitude (scaled to integer, e.g., 124964 = 12.4964°)
        uint256 timestamp;      // Time of creation (Unix timestamp)
        string[] themes;        // Array of themes (e.g., ["Art", "Science"])
        string climatology;     // Climatology data (e.g., "Sunny, 25°C")
    }

    // Mapping from token ID to capsule metadata
    mapping(uint256 => Capsule) public capsules;

    // Base URI for metadata (e.g., IPFS or a server)
    string private _baseTokenURI;

    // Event emitted when a capsule is minted
    event CapsuleMinted(uint256 indexed tokenId, address indexed owner, string content);

    /**
     * @dev Constructor initializing the ERC-721 contract with name and symbol.
     * @param initialOwner Address of the contract owner (e.g., Kudos founder).
     */
    constructor(address initialOwner) ERC721("KudosCapsuleNFT", "KCAP") Ownable(initialOwner) {
        _baseTokenURI = "https://ipfs.io/ipfs/"; // Default base URI, adjustable
        _tokenIdCounter.increment(); // Start token IDs at 1
    }

    /**
     * @dev Mint a new Capsule NFT with multidimensional attributes.
     * @param recipient Address to receive the NFT.
     * @param content Capsule content.
     * @param latitude Geolocation latitude (scaled integer).
     * @param longitude Geolocation longitude (scaled integer).
     * @param themes Array of themes.
     * @param climatology Climatology data.
     * @return tokenId The ID of the minted NFT.
     */
    function mintCapsule(
        address recipient,
        string memory content,
        int256 latitude,
        int256 longitude,
        string[] memory themes,
        string memory climatology
    ) public onlyOwner returns (uint256) {
        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();

        // Store capsule metadata
        capsules[tokenId] = Capsule({
            content: content,
            latitude: latitude,
            longitude: longitude,
            timestamp: block.timestamp,
            themes: themes,
            climatology: climatology
        });

        // Mint the NFT
        _safeMint(recipient, tokenId);
        emit CapsuleMinted(tokenId, recipient, content);

        return tokenId;
    }

    /**
     * @dev Get the metadata of a capsule by token ID.
     * @param tokenId The ID of the capsule NFT.
     * @return Capsule struct containing metadata.
     */
    function getCapsule(uint256 tokenId) public view returns (Capsule memory) {
        require(_exists(tokenId), "CapsuleNFT: Query for nonexistent token");
        return capsules[tokenId];
    }

    /**
     * @dev Override tokenURI to return metadata URI (e.g., IPFS link).
     * @param tokenId The ID of the capsule NFT.
     * @return URI string for the token metadata.
     */
    function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
        require(_exists(tokenId), "CapsuleNFT: URI query for nonexistent token");
        return string(abi.encodePacked(_baseTokenURI, tokenId.toString(), ".json"));
    }

    /**
     * @dev Set the base URI for token metadata.
     * @param baseURI New base URI (e.g., "https://ipfs.io/ipfs/").
     */
    function setBaseURI(string memory baseURI) public onlyOwner {
        _baseTokenURI = baseURI;
    }

    /**
     * @dev Override supportsInterface for ERC-721 compatibility.
     */
    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC721) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}