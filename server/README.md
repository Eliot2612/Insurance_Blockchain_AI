# Weather Insurance Blockchain

This project implements a blockchain-based weather insurance system using Solidity smart contracts. The system includes policy management, claim handling, payment processing, and escrow mechanisms.

## Requirements

Before starting, ensure you have the following installed:
- [Node.js](https://nodejs.org/) (version 16 or later)
- [Hardhat](https://hardhat.org/) (Ethereum development environment)
- [npm](https://www.npmjs.com/) (Node package manager)

## Setup

1. Clone the repository:
   ```sh
   git clone https://github.com/your-repo/weather-insurance-blockchain.git
   cd weather-insurance-blockchain
   ```

2. Install dependencies:
   ```sh
   npm install
   ```

## Running the Blockchain Locally

1. Start a local Hardhat node:
   ```sh
   npx hardhat node
   ```

2. Open a new terminal window and compile the smart contracts:
   ```sh
   npx hardhat clean
   npx hardhat compile
   ```

3. Deploy the smart contracts using Hardhat Ignition:
   ```sh
   npx hardhat ignition deploy ./ignition/modules/InsurancePolicy.js
   npx hardhat ignition deploy ./ignition/modules/InsuranceClaims.js
   npx hardhat ignition deploy ./ignition/modules/Escrow.js
   npx hardhat ignition deploy ./ignition/modules/InsurancePayment.js
   npx hardhat ignition deploy ./ignition/modules/InsurancePayOut.js
   ```

## Testing

Run the test suite to ensure the contracts function correctly:
```sh
npx hardhat test
```

## License

This project is licensed under the MIT License. See the LICENSE file for more details.