import { DeployFunction } from "hardhat-deploy/types";

const ctName = "MetisSequencerSet";

const func: DeployFunction = async function (hre) {
  if (!hre.network.tags["l2"]) {
    throw new Error(`current network ${hre.network.name} is not an L2`);
  }

  const { deployer } = await hre.getNamedAccounts();

  const seq = process.env.METIS_SEQSET_FIRST_SEQUENCER;
  const startBlock = parseInt(
    process.env.METIS_SEQSET_FIRST_START_BLOCK as string,
    0,
  );
  const endblock = parseInt(
    process.env.METIS_SEQSET_FIRST_END_BLOCK as string,
    0,
  );

  const epochLength = parseInt(
    process.env.METIS_SEQSET_EPOCH_LENGTH as string,
    0,
  );

  console.log(
    "using params:",
    "seq",
    seq,
    "start",
    startBlock,
    "end",
    endblock,
    "epochLength",
    epochLength,
  );

  await hre.deployments.deploy(ctName, {
    from: deployer,
    proxy: {
      proxyContract: "OpenZeppelinTransparentProxy",
      execute: {
        init: {
          methodName: "initialize",
          // use deployer as the first mpc address
          args: [seq, deployer, startBlock, endblock, epochLength],
        },
      },
    },
    waitConfirmations: 1,
    log: true,
  });
};

func.tags = [ctName, "l2"];

export default func;
