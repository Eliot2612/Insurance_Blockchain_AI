// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;


interface IEscrow {
    function depositFunds(bytes32 _policyId, address _caller) external payable returns (bool);
    function releaseFunds(bytes32 _policyId, address payable recipient) external;
    function getBalance(bytes32 _policyId, address _caller) external view returns (uint256);
}
