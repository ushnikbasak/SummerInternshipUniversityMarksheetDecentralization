const MainContract = artifacts.require("MainContract");

contract("UniversityMarksheetDecentralisation", (accounts) => {
  const dean = accounts[0];
  const professor = accounts[1];
  const associateDean = accounts[2];

  let contract;

  beforeEach(async () => {
    contract = await MainContract.new([professor], [associateDean], { from: dean });
  });

  it("should allow professor to upload marksheet", async () => {
    await contract.upload(101, 85, { from: professor });
    const marksheet = await contract.viewMarksheet(101);
    // Corrected line: marksheet.marks is already a number or BigInt
    assert.equal(marksheet.marks, 85);
    assert.equal(marksheet.professorAddress, professor);
  });

  it("should allow associate dean to validate with correct PoW", async () => {
    await contract.upload(102, 90, { from: professor });

    // Simulate PoW: Find a nonce such that keccak256(nonce, 102, 90, professor)[0] === 0
    let nonce = 0;
    let hash;
    const web3 = MainContract.web3;

    while (true) {
      hash = web3.utils.soliditySha3({ t: 'uint256', v: nonce }, 102, 90, professor);
      if (hash.substring(2, 4) === "00") break;
      nonce++;
    }

    await contract.validate(102, nonce, { from: associateDean });
    const marksheet = await contract.viewMarksheet(102);
    assert.isTrue(marksheet.isValidated, "Marksheet should be validated");
  });

  it("should allow dean to finalize after validation", async () => {
    await contract.upload(103, 95, { from: professor });

    // Do PoW
    let nonce = 0;
    let hash;
    const web3 = MainContract.web3;

    while (true) {
      hash = web3.utils.soliditySha3({ t: 'uint256', v: nonce }, 103, 95, professor);
      if (hash.substring(2, 4) === "00") break;
      nonce++;
    }

    await contract.validate(103, nonce, { from: associateDean });
    await contract.finalUpload(103, { from: dean });

    const marksheet = await contract.viewMarksheet(103);
    assert.isTrue(marksheet.isUploaded, "Marksheet should be finalized");
  });

  it("should verify valid marksheet data", async () => {
    await contract.upload(104, 88, { from: professor });

    // Do PoW
    let nonce = 0;
    let hash;
    const web3 = MainContract.web3;

    while (true) {
      hash = web3.utils.soliditySha3({ t: 'uint256', v: nonce }, 104, 88, professor);
      if (hash.substring(2, 4) === "00") break;
      nonce++;
    }

    await contract.validate(104, nonce, { from: associateDean });
    const marksheet = await contract.viewMarksheet(104);

    const isValid = await contract.verify(
      104,
      88,
      professor,
      true,
      associateDean,
      marksheet.timestamp
    );

    assert.isTrue(isValid, "Verification should pass with correct data");
  });
});