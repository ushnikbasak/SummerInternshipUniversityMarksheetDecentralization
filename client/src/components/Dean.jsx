import React, { useState, useContext, useEffect } from "react";
import { Web3Context } from "../contexts/Web3Context";

const Dean = () => {
  const { contract, account } = useContext(Web3Context);
  const [studentId, setStudentId] = useState("");
  const [marksheet, setMarksheet] = useState(null);
  const [status, setStatus] = useState("");
  const [isDean, setIsDean] = useState(false);

  const zeroAddress = "0x0000000000000000000000000000000000000000";

  useEffect(() => {
    const checkRole = async () => {
      if (!contract || !account) {
        setIsDean(false);
        return;
      }
      try {
        const deanAddress = await contract.methods.dean().call();
        setIsDean(deanAddress.toLowerCase() === account.toLowerCase());
      } catch (err) {
        console.error("Role check failed:", err);
        setIsDean(false);
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
            result.isUploaded
              ? "Marksheet already finalized."
              : "Marksheet ready for final approval."
          );
        }
      } catch (err) {
        console.error("Error fetching marksheet:", err);
        setStatus("Error fetching marksheet. Check console for details.");
      }
    };

    fetchMarksheet();
  }, [studentId, contract]);

  const handleFinalize = async () => {
    if (!isDean) {
      setStatus("❌ Only the dean can finalize marksheets.");
      return;
    }
    if (!marksheet || marksheet.isUploaded) return;

    try {
      await contract.methods.finalUpload(studentId).send({ from: account });
      setStatus("✅ Marksheet finalized and uploaded.");

      // Refresh the latest data
      const updated = await contract.methods.viewMarksheet(studentId).call();
      setMarksheet(updated);
    } catch (err) {
      console.error("Final upload failed:", err);
      setStatus("❌ Final upload failed. See console.");
    }
  };

  return (
    <div className="form-box">
      <h3>Dean Panel</h3>
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
            <strong>Student ID:</strong> {marksheet.studentId}
          </p>
          <p>
            <strong>Marks:</strong> {marksheet.marks}
          </p>
          <p>
            <strong>Professor Address:</strong> {marksheet.professorAddress}
          </p>
          <p>
            <strong>Validated:</strong> {marksheet.isValidated ? "Yes" : "No"}
          </p>
          <p>
            <strong>Validated By:</strong> {marksheet.validatedBy}
          </p>
          <p>
            <strong>Validation Timestamp:</strong> {marksheet.timestamp}
          </p>
          <p>
            <strong>Already Finalized:</strong> {marksheet.isUploaded ? "Yes" : "No"}
          </p>
        </div>
      )}

      <button
        onClick={handleFinalize}
        disabled={!isDean || !marksheet || !marksheet.isValidated || marksheet.isUploaded}
      >
        Finalize Marksheet
      </button>
      {!isDean && <p style={{ color: "red" }}>Only the dean can finalize marksheets.</p>}
      <p className="status-message">{status}</p>
    </div>
  );
};

export default Dean;
