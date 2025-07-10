import React, { useState, useContext, useEffect } from "react";
import { Web3Context } from "../contexts/Web3Context";
import Web3 from "web3";

const AssociateDean = () => {
  const { contract, account } = useContext(Web3Context);
  const [studentId, setStudentId] = useState("");
  const [marksheet, setMarksheet] = useState(null);
  const [status, setStatus] = useState("");
  const [nonce, setNonce] = useState(null);
  const [isAssociateDean, setIsAssociateDean] = useState(false);
  const [validatedByMe, setValidatedByMe] = useState([]);
  const [pendingValidation, setPendingValidation] = useState([]);
  const [showPending, setShowPending] = useState(false);
  const [showValidated, setShowValidated] = useState(false);


  const zeroAddress = "0x0000000000000000000000000000000000000000";

  useEffect(() => {
    const checkRole = async () => {
      if (!contract || !account) {
        setIsAssociateDean(false);
        return;
      }
      try {
        const result = await contract.methods.isAssociateDean(account).call();
        setIsAssociateDean(result);
      } catch (err) {
        console.error("Role check failed:", err);
        setIsAssociateDean(false);
      }
    };
    checkRole();
  }, [contract, account]);

  useEffect(() => {
    const fetchMarksheet = async () => {
      if (!studentId) return;

      try {
        const result = await contract.methods.viewMarksheet(studentId).call();

        if (result.professorAddress === zeroAddress) {
          setMarksheet(null);
          setStatus("Marksheet not found for this Student ID.");
        } else {
          setMarksheet(result);
          setStatus(
            result.isValidated
              ? "Marksheet loaded. It is already validated."
              : "Marksheet loaded. Calculate nonce to validate."
          );
        }
      } catch (err) {
        console.error("Error fetching marksheet:", err);
        setStatus("Error fetching marksheet. Check console for details.");
      }
    };

    fetchMarksheet();
  }, [studentId, contract]);

  useEffect(() => {
    const fetchAllStudents = async () => {
      if (!contract || !account) return;

      try {
        const length = await contract.methods.studentListLength().call();
        const validated = [];
        const pending = [];

        for (let i = 0; i < length; i++) {
          const studentId = await contract.methods.studentList(i).call();
          const m = await contract.methods.viewMarksheet(studentId).call();

          if (m.professorAddress !== zeroAddress) {
            if (m.isValidated && m.validatedBy.toLowerCase() === account.toLowerCase()) {
              validated.push({
                studentId: m.studentId,
                marks: m.marks,
                professorAddress: m.professorAddress,
                timestamp: m.timestamp,
              });
            } else if (!m.isValidated) {
              pending.push({
                studentId: m.studentId,
                marks: m.marks,
                professorAddress: m.professorAddress,
              });
            }
          }
        }

        setValidatedByMe(validated);
        setPendingValidation(pending);
      } catch (err) {
        console.error("Error loading student data:", err);
      }
    };

    fetchAllStudents();
  }, [contract, account]);

  const calculateNonce = async () => {
    if (!marksheet) return;

    setStatus("Calculating nonce...");
    let currentNonce = 0;
    const MAX_ITERATIONS = 10000000;

    while (currentNonce < MAX_ITERATIONS) {
      const verificationHash = Web3.utils.keccak256(
        Web3.utils.encodePacked(
          currentNonce.toString(),
          marksheet.studentId.toString(),
          marksheet.marks.toString(),
          marksheet.professorAddress
        )
      );

      if (verificationHash.startsWith("0x00")) {
        setNonce(currentNonce);
        setStatus(`Nonce found: ${currentNonce}. You can now validate.`);
        return;
      }
      currentNonce++;
    }

    setStatus("Could not find valid nonce within iterations limit.");
  };

  const handleValidate = async () => {
    if (!isAssociateDean) {
      setStatus("❌ Only an associate dean can validate marksheets.");
      return;
    }
    if (!marksheet || nonce === null) {
      setStatus("❌ No nonce found or marksheet missing.");
      return;
    }

    try {
      await contract.methods.validate(studentId, nonce).send({ from: account });
      setStatus("✅ Marksheet validated successfully!");

      const updated = await contract.methods.viewMarksheet(studentId).call();
      setMarksheet(updated);

      // Add to validatedByMe
      setValidatedByMe((prev) => [
        ...prev,
        {
          studentId: updated.studentId,
          marks: updated.marks,
          professorAddress: updated.professorAddress,
          timestamp: updated.timestamp,
        },
      ]);

      // Remove from pendingValidation
      setPendingValidation((prev) =>
        prev.filter((s) => s.studentId.toString() !== studentId.toString())
      );
    } catch (err) {
      console.error("Validation failed:", err);
      setStatus("❌ Validation failed. Check console for details.");
    }
  };

  return (
    <div className="form-box">
      <br></br>
      <h3>Associate Dean Panel</h3>
      <p>Connected as: {account || "Not connected"}</p>
      <input
        type="number"
        placeholder="Student ID"
        value={studentId}
        onChange={(e) => setStudentId(e.target.value)}
      />

      {marksheet && marksheet.professorAddress !== zeroAddress && (
        <div className="marksheet-details">
          <h4>Marksheet Details (from blockchain)</h4>
          <p>
            <strong>Student ID:</strong> {marksheet.studentId.toString()}
          </p>
          <p>
            <strong>Marks:</strong> {marksheet.marks.toString()}
          </p>
          <p>
            <strong>Professor Address:</strong> {marksheet.professorAddress}
          </p>
          <p>
            <strong>Validated:</strong> {marksheet.isValidated ? "Yes" : "No"}
          </p>
          {marksheet.isValidated && (
            <>
              <p>
                <strong>Validated By:</strong> {marksheet.validatedBy}
              </p>
              <p>
                <strong>Validation Timestamp:</strong> {marksheet.timestamp.toString()}
              </p>
            </>
          )}
        </div>
      )}

      <button
        onClick={calculateNonce}
        disabled={
          !studentId ||
          !marksheet ||
          marksheet.isValidated ||
          (marksheet && marksheet.professorAddress === zeroAddress) ||
          !isAssociateDean
        }
      >
        Calculate Nonce (PoW)
      </button>
      <button
        onClick={handleValidate}
        disabled={
          nonce === null ||
          !studentId ||
          !marksheet ||
          marksheet.isValidated ||
          (marksheet && marksheet.professorAddress === zeroAddress) ||
          !isAssociateDean
        }
      >
        Validate Marksheet
      </button>
      {!isAssociateDean && <p style={{ color: "red" }}>Only an associate dean can validate marksheets.</p>}
      <p className="status-message">{status}</p>
      {nonce !== null && (
        <p>
          Calculated Nonce: <strong>{nonce}</strong>
        </p>
      )}
    

      <div className="lists-container">

        {/* ✅ Validated List (collapsible) */}
        <div className="list-box">
          <button 
          onClick={() => setShowValidated(!showValidated)}
          disabled={!isAssociateDean}
          >
            ✅ Validated Students {showValidated ? "▲" : "▼"}
          </button>

          {showValidated && validatedByMe.length > 0 && (
            <table className="uploaded-students-table">
              <thead>
                <tr>
                  <th>Student ID</th>
                  <th>Marks</th>
                  <th>Professor</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {validatedByMe.map((s, index) => (
                  <tr key={index}>
                    <td>{s.studentId}</td>
                    <td>{s.marks}</td>
                    <td>{s.professorAddress}</td>
                    <td>{s.timestamp}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {showValidated && validatedByMe.length === 0 && (
            <p>No validated marksheets by you yet.</p>
          )}
        </div>

        {/* ❌ Unvalidated List (collapsible) */}
        <div className="list-box">
          <button 
          onClick={() => setShowPending(!showPending)}
          disabled={!isAssociateDean}
          >
            ❌ Unvalidated Students {showValidated ? "▲" : "▼"}
          </button>

          {showPending && pendingValidation.length > 0 && (
            <table className="uploaded-students-table">
              <thead>
                <tr>
                  <th>Student ID</th>
                  <th>Marks</th>
                  <th>Professor</th>
                </tr>
              </thead>
              <tbody>
                {pendingValidation.map((s, index) => (
                  <tr key={index}>
                    <td>{s.studentId}</td>
                    <td>{s.marks}</td>
                    <td>{s.professorAddress}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {showPending && pendingValidation.length === 0 && (
            <p>No unvalidated marksheets found.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AssociateDean;
