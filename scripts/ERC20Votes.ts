import { ContractFactory } from "ethers";
import { ethers } from "hardhat";
import { MyToken__factory } from "../typechain-types";

const MINT_VALUE = ethers.utils.parseEther("10");
let logIterator: number = 0;

const blockNumReporter = async (step: string) => {
  const blockNum = (await ethers.provider.getBlock("latest")).number;
  console.log(
    `_________${step}(Log-${logIterator}) - Current block number is ${blockNum}_________`
  );
  logIterator += 1;
};

async function main() {
  // DEPLOY CONTRACT (block 0) & GET SIGNERS
  const [owner, acct1, acct2] = await ethers.getSigners();
  blockNumReporter("DEPLOY CONTRACT & GET SIGNERS");
  const contractFactory = new MyToken__factory(owner);
  const contract = await contractFactory.deploy();
  await contract.deployed();
  console.log(`   Token contract deployed at ${contract.address}\n`);

  // MINT TOKENS (starts @ block 1) **NEW block created**
  // minting from account[0] (the default role) for account[1]
  blockNumReporter("MINT TOKENS");
  const mintTx = await contract.mint(acct1.address, MINT_VALUE); // no need to connect to account[0] as it is already default acct. min
  await mintTx.wait();
  console.log(
    `   Minted ${MINT_VALUE.toString()} decimal units to account ${
      acct1.address
    }\n`
  );
  const balanceBN = await contract.balanceOf(acct1.address);
  console.log(`   acct1 has ${balanceBN.toString()} decimal units of MyToken\n`);

  // CHECK VOTING POWER (starts @ block 2) **no block activity**
  blockNumReporter("CHECK VOTING POWER");
  const votesBeforeDelegation = await contract.getVotes(acct1.address);
  console.log(
    `   Account ${
      acct1.address
    } has ${votesBeforeDelegation.toString()} units of voting power before self-delegating\n`
  );

  // DELEGATE ACCT1 (starts @ block 2) **NEW block created**
  blockNumReporter("DELEGATE ACCT1");
  const delegateTxAcct1 = await contract.connect(acct1).delegate(acct1.address);
  await delegateTxAcct1.wait();

  // CHECK VOTING POWER (starts @ block 3) **no block activity**
  blockNumReporter("CHECK VOTING POWER");
  const votesAfterDelegation = await contract.getVotes(acct1.address);
  console.log(
    `   Account ${
      acct1.address
    } has ${votesAfterDelegation.toString()} units of voting power after self-delegating\n`
  );

  // TRANSFER (starts @ block 3) **NEW block created**
  blockNumReporter("TRANSFER");
  const transferTx = await contract
    .connect(acct1)
    .transfer(acct2.address, MINT_VALUE.div(2));
  await transferTx.wait();

  // CHECK VOTING POWER OF ACCT1 & ACCT2 AFTER TRANSFER (ACCT2 NEEDS DELEGATION) (starts @ block 4) **no block activity**
  blockNumReporter(
    "CHECK VOTING POWER OF ACCT1 & ACCT2 AFTER TRANSFER (ACCT2 NEEDS DELEGATION)"
  );
  const [account1VotingPower, account2VotingPower] = await Promise.all(
    [acct1, acct2].map((acc) => contract.getVotes(acc.address))
  );
  console.log(
    `   Account1 has ${account1VotingPower.toString()} units of voting power after transferring half of the original amount\n`
  );
  console.log(
    `   Account2 has ${account2VotingPower.toString()} units of voting power after transfer and no delegation\n`
  );

  // DELEGATE ACCT2 (starts @ block 4) **ADDED block created**
  blockNumReporter("DELEGATE ACCT2");
  const delegateTxAcct2 = await contract.connect(acct2).delegate(acct2.address);
  await delegateTxAcct2.wait();

  // CHECKING VOTING POWER OF ACCT2 (starts @ block 5) **no block activity**
  blockNumReporter("CHECKING VOTING POWER OF ACCT2");
  const acct2VotingPower = await contract.getVotes(acct2.address);
  console.log(
    `   Account2 has ${acct2VotingPower} units of voting power after self-delegation\n`
  );

  // GET PAST VOTES (starts @ block 5) **no block activity**
  blockNumReporter("GET PAST VOTES");
  const lastBlock = await ethers.provider.getBlock("latest");
  const pastVotesForAcct1 = await contract.getPastVotes(
    acct1.address,
    lastBlock.number - 2
  );
  console.log(
    `   Account 1 had ${pastVotesForAcct1} units of voting power at the two previous block\n`
  );
}

main().catch((err) => {
  console.log(err);
  process.exitCode = 1;
});
