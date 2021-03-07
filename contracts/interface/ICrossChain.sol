pragma solidity ^0.6.0;

interface ICrossChain {

    function channelSendSequenceMap(uint8 channelId) external returns (uint64);

    function channelReceiveSequenceMap(uint8 channelId) external returns (uint64);

}