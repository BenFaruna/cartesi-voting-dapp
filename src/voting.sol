// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract Voting {
    struct Candidate {
        string name;
        int32 votes;
    }
    address owner;

    mapping(string => Candidate) votes;
    string[] candidates;

    mapping(address => bool) voted;

    constructor() {
        owner = msg.sender;
    }

    function addCandidate(string memory _name) public {
        if (_nameExists(_name)) {
            revert("name exists");
        }
        Candidate memory candidate;
        candidate.name = _name;
        votes[_name] = candidate;

        candidates.push(_name);
    }

    function updateVotes(Candidate[] memory data) external {
        if (msg.sender != owner) {
            revert("not owner");
        }
        uint256 length = data.length;
        Candidate memory candidate;
        for (uint32 i = 0; i < length; i++) {
            candidate = data[i];
            if (!_nameExists(candidate.name)) {
                candidates.push(candidate.name);
            }
            votes[candidate.name] = candidate;
        }
    }

    function getVotes() public view returns (Candidate[] memory) {
        uint256 _length = candidates.length;
        Candidate[] memory _votes = new Candidate[](_length);

        for (uint256 i = 0; i < _length; i++) {
            _votes[i] = votes[candidates[i]];
        }

        return _votes;
    }

    function _nameExists(string memory _name) private view returns (bool) {
        uint256 _length = candidates.length;

        for (uint256 i = 0; i < _length; i++) {
            if (
                keccak256(abi.encodePacked(candidates[i])) ==
                keccak256(abi.encodePacked(_name))
            ) {
                return true;
            }
        }
        return false;
    }
}
