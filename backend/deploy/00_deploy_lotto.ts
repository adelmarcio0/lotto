import type { DeployFunction } from "hardhat-deploy/types";
import type { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, ethers } = hre;
  const { deploy, log } = deployments;

  const { deployer } = await getNamedAccounts();
  log(`Deployer: ${deployer}`);

  await deploy("Lotto", {
    from: deployer,
    args: [],
    log: true,
    waitConfirmations: 1,
  });

  const deployment = await deployments.get("Lotto");
  const lotto = await ethers.getContractAt("Lotto", deployment.address);
  log(`Lotto deployed at: ${await lotto.getAddress()}`);
};

export default func;
func.tags = ["Lotto"];


