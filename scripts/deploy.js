
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const hre = require("hardhat");

async function main() {
  const AiLogger = await hre.ethers.getContractFactory("AiLogger");
  const aiLogger = await AiLogger.deploy();

  await aiLogger.waitForDeployment();

  console.log(`AiLogger deployed to ${await aiLogger.getAddress()}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
