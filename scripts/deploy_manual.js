
import { ethers } from "ethers";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const artifactPosition = "../artifacts/contracts/AiLogger.sol/AiLogger.json";
// Resolving correct path might require checking where we run it from
const artifact = require(artifactPosition);

async function main() {
    const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
    const signer = await provider.getSigner();

    console.log("Deploying with account:", await signer.getAddress());

    const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, signer);
    const contract = await factory.deploy();

    await contract.waitForDeployment();

    console.log("AiLogger deployed to:", await contract.getAddress());
}

main().catch(console.error);
