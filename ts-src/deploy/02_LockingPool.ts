import { DeployFunction } from "hardhat-deploy/types";

const ctName = "LockingPool";

const func: DeployFunction = async function (hre) {
  if (!hre.network.tags["l1"]) {
    throw new Error(`current network ${hre.network.name} is not an L1`);
  }

  const { deployer } = await hre.getNamedAccounts();

  const bridge = process.env.METIS_BRIDGE;
  const l1Metis = process.env.MEITS_L1_TOKEN;
  const { address: LockingNFTAddress } =
    await hre.deployments.get("LockingNFT");
  const l2Chainid = parseInt(process.env.METIS_L2_CHAINID as string, 0);

  const l2Metis = "0xDeadDeAddeAddEAddeadDEaDDEAdDeaDDeAD0000";

  console.log(
    "using",
    bridge,
    "bridge",
    "l1Metis",
    l1Metis,
    "l2ChainId",
    l2Chainid,
  );

  await hre.deployments.deploy(ctName, {
    from: deployer,
    proxy: {
      proxyContract: "OpenZeppelinTransparentProxy",
      execute: {
        init: {
          methodName: "initialize",
          args: [
            bridge,
            l1Metis,
            l2Metis,
            LockingNFTAddress,
            deployer,
            l2Chainid,
          ],
        },
      },
    },
    waitConfirmations: 3,
    log: true,
  });
};

func.tags = [ctName, "l1"];

export default func;
