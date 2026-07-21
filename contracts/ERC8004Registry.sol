// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title ERC8004Registry
 * @notice Minimal on-chain identity registry for autonomous agents. Each
 * caller registers itself once by publishing a URI (typically an agent card
 * JSON) and gets back a stable numeric agentId permanently tied to their
 * address. This is the exact ABI agent/lib/erc8004.ts's registerAgentOnChain
 * already targets — deploy this contract, point the automaton at its
 * address, and register_erc8004 works with zero code changes.
 *
 * Design choices, deliberately minimal:
 * - One registration per address, forever (immutable once set — matches
 *   the automaton's own "wallet never changes" identity model).
 * - No admin, no owner, no upgradability, no pausability. Nothing to rug.
 * - agentId is simply an incrementing counter, not a token — no ERC-721
 *   machinery, transfers, or approvals. An agent's identity is not
 *   transferable by design; it is the address that speaks for it.
 */
contract ERC8004Registry {
    /// @notice Emitted once per successful registration.
    event AgentRegistered(uint256 indexed agentId, address indexed owner, string agentURI);

    /// @notice owner => agentId (0 means "not registered" — real ids start at 1).
    mapping(address => uint256) public agentIdOf;

    /// @notice agentId => owner, for reverse lookup.
    mapping(uint256 => address) public ownerOf;

    /// @notice agentId => the URI it was registered with.
    mapping(uint256 => string) public agentURIOf;

    uint256 private _nextAgentId = 1;

    error AlreadyRegistered(address owner, uint256 existingAgentId);
    error EmptyURI();

    /**
     * @notice Register the caller as an agent, publishing its agentURI.
     * Reverts if this address already registered. Irreversible.
     * @param agentURI Publicly reachable URI describing the agent (e.g. an
     * agent card JSON). Not validated on-chain beyond non-empty — the caller
     * is responsible for hosting durable, honest content there.
     * @return agentId The newly assigned, permanent agent id.
     */
    function registerAgent(string calldata agentURI) external returns (uint256 agentId) {
        if (bytes(agentURI).length == 0) revert EmptyURI();
        if (agentIdOf[msg.sender] != 0) {
            revert AlreadyRegistered(msg.sender, agentIdOf[msg.sender]);
        }

        agentId = _nextAgentId++;
        agentIdOf[msg.sender] = agentId;
        ownerOf[agentId] = msg.sender;
        agentURIOf[agentId] = agentURI;

        emit AgentRegistered(agentId, msg.sender, agentURI);
    }

    /// @notice Total number of agents registered so far.
    function totalRegistered() external view returns (uint256) {
        return _nextAgentId - 1;
    }
}
