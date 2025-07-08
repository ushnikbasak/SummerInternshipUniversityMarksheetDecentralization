const MainContract = artifacts.require("./MainContract.sol");

module.exports = async function (deployer, network, accounts) {
  // Choose professor and associate dean accounts
  const professors = [accounts[1], accounts[2]];
  const associateDeans = [accounts[3], accounts[4]];

  // Log the selected accounts for clarity
  console.log("Deploying mainContract from:", accounts[0]);
  console.log("Professors:", professors);
  console.log("Associate Deans:", associateDeans);

  // Basic sanity checks before deployment
  if (professors.includes(undefined) || associateDeans.includes(undefined)) {
    throw new Error("One or more accounts are undefined. Check Ganache or test accounts.");
  }

  if (professors.length === 0 || associateDeans.length === 0) {
    throw new Error("At least one professor and one associate dean must be provided.");
  }

  // Deploy the contract with initial role assignments
  await deployer.deploy(MainContract, professors, associateDeans);

  console.log("mainContract deployed successfully.");
};
