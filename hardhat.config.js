import { createRequire } from "module";
const require = createRequire(import.meta.url);
require("@nomicfoundation/hardhat-ethers");

/** @type import('hardhat/config').HardhatUserConfig */
const config = {
  solidity: "0.8.27",
  networks: {
    localhost: {
      url: "http://127.0.0.1:8545"
    }
  }
};

export default config;
