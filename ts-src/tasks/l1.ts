import { task } from "hardhat/config";
import { LockingPool, TestERC20 } from "../../typechain-types";
import fs from "fs";

const lockingPoolName = "LockingPool";

task("l1:whitelist", "Whitelist sequencer address")
  .addOptionalParam("seq", "The sequencer address")
  .addOptionalParam("enable", "to remove the sequencer", "true")
  .setAction(async (args, hre) => {
    if (!hre.network.tags["l1"]) {
      throw new Error(`${hre.network.name} is not an l1`);
    }

    const { address: lockingPoolAddress } =
      await hre.deployments.get("LockingPool");

    const LockingPool = await hre.ethers.getContractAt(
      lockingPoolName,
      lockingPoolAddress,
    );

    const enable = Boolean(args["enable"]);
    if (enable) {
      console.log(`Adding ${args["seq"]} to whitelist`);
    } else {
      console.log(`Removing ${args["seq"]} to whitelist`);
    }

    const tx = await LockingPool.setWhiteListAddress(
      args["seq"],
      Boolean(args["enable"]),
    );
    await tx.wait();
  });

task("l1:lock", "Lock Metis to LockingPool contract")
  .addOptionalParam("key", "the private key file for the sequencer")
  .addOptionalParam("amount", "lock amount in Metis")
  .setAction(async (args, hre) => {
    if (!hre.network.tags["l1"]) {
      throw new Error(`${hre.network.name} is not an l1`);
    }

    const { address: lockingPoolAddress } =
      await hre.deployments.get("LockingPool");

    const [signer] = await hre.ethers.getSigners();

    const seqKey = new hre.ethers.SigningKey(
      fs.readFileSync(args["key"]).toString("utf8").trim(),
    );

    const seqWallet = new hre.ethers.Wallet(seqKey, hre.ethers.provider);

    console.log("Locking for", seqWallet.address);

    const LockingPoolFactory =
      await hre.ethers.getContractFactory(lockingPoolName);

    const contract = <LockingPool>(
      await LockingPoolFactory.attach(lockingPoolAddress)
    );

    console.log("checking whitelist status");
    const isWhitelisted = await contract.whiteListAddresses(seqWallet.address);
    if (!isWhitelisted) {
      throw new Error(`Your address ${signer.address} is not whitelisted`);
    }

    const metisFactory = await hre.ethers.getContractFactory("TestERC20");
    const metisL1Addr = process.env.MEITS_L1_TOKEN as string;
    const metis = <TestERC20>await metisFactory.attach(metisL1Addr);

    const poolAddress = await contract.getAddress();
    const amountInWei = hre.ethers.parseEther(args["amount"]);

    console.log("checking the balance");
    const balance = await metis.balanceOf(seqWallet.address);
    if (balance < amountInWei) {
      throw new Error(
        `Insufficient Metis balance, current balance ${hre.ethers.formatEther(balance)}, required balance ${args["amount"]}`,
      );
    }

    console.log("checking the allowance");
    const allowance = await metis.allowance(seqWallet.address, poolAddress);
    if (allowance < amountInWei) {
      console.log("approving Metis to LockingPool");
      const tx = await metis
        .connect(seqWallet)
        .approve(await contract.getAddress(), amountInWei);
      await tx.wait(3);
    }

    console.log("locking...");
    const tx = await contract
      .connect(seqWallet)
      .lockFor(
        seqWallet.address,
        amountInWei,
        Buffer.from(seqKey.publicKey.slice(4), "hex"),
      );
    await tx.wait();
  });

task("l1:update-lock-amount", "Update locking amount condition")
  .addOptionalParam("min", "Min amount in Metis")
  .addOptionalParam("max", "Max amount in Metis")
  .setAction(async (args, hre) => {
    if (!hre.network.tags["l1"]) {
      throw new Error(`${hre.network.name} is not an l1`);
    }

    const { address: lockingPoolAddress } =
      await hre.deployments.get("LockingPool");

    const contract = await hre.ethers.getContractAt(
      lockingPoolName,
      lockingPoolAddress,
    );

    if (args["min"]) {
      const min = hre.ethers.parseEther(args["min"]);
      const min2 = await contract.minLock();
      if (min != min2) {
        console.log(
          `setting min lock to ${args["min"]}, the previous is ${hre.ethers.formatEther(min2)}`,
        );
        const tx = await contract.updateMinAmounts(min);
        await tx.wait(2);
      }
    }

    if (args["max"]) {
      const max = hre.ethers.parseEther(args["max"]);
      const max2 = await contract.maxLock();
      if (max != max2) {
        console.log(
          `setting min lock to ${args["max"]}, the previous is ${hre.ethers.formatEther(max2)}`,
        );
        const tx = await contract.updateMaxAmounts(max);
        await tx.wait();
      }
    }
  });

task("l1:update-mpc-address", "Update MPC address for LockingPool contract")
  .addOptionalParam("contract", "The LockingPool address")
  .addOptionalParam("mpcAddress", "The new MPC address")
  .setAction(async (args, hre) => {
    if (!hre.network.tags["l1"]) {
      throw new Error(`${hre.network.name} is not an l1`);
    }

    const LockingPoolFactory =
      await hre.ethers.getContractFactory(lockingPoolName);

    const LockingPool = <LockingPool>(
      await LockingPoolFactory.attach(args["contract"])
    );

    const tx = await LockingPool.updateMpc(args["mpcAddress"]);
    await tx.wait();
  });
