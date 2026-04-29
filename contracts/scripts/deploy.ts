import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying AgentCourt from:", deployer.address);

  const AgentCourt = await ethers.getContractFactory("AgentCourt");
  const contract = await AgentCourt.deploy();
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log("AgentCourt deployed to:", address);
  console.log("View at: https://chainscan-galileo.0g.ai/address/" + address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
