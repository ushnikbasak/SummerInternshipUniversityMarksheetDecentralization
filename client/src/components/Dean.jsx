import React, { useState, useContext, useEffect } from "react";
import { Web3Context } from "../contexts/Web3Context";

const Dean = () => {
  const { contract, account } = useContext(Web3Context);
  const [studentId, setStudentId] = useState("");
  const [marksheet, setMarksheet] = useState(null);
  const [status, setStatus] = useState("");
  const [isDean, setIsDean] = useState(false);
  const [finalizedStudents, setFinalizedStudents] = useState([]);
  const [notFinalizedStudents, setNotFinalizedStudents] = useState([]);
  const [showFinalized, setShowFinalized] = useState(false);
  const [showNotFinalized, setShowNotFinalized] = useState(false);

  const zeroAddress = "0x0000000000000000000000000000000000000000";

  useEffect(() => {
    const checkRole = async () => {
      if (!contract || !account) return;
      try {
        const deanAddress = await contract.methods.dean().call();
        setIsDean(deanAddress.toLowerCase() === account.toLowerCase());
      } catch (err) {
        console.error("Role check failed:", err);
      }
    };
    checkRole();
  }, [contract, account]);

  useEffect(() => {
    if (!studentId) return;
    const fetchMarksheet = async () => {
      try {
        const result = await contract.methods.viewMarksheet(studentId).call();
        if (result.professorAddress === zeroAddress) {
          setMarksheet(null);
          setStatus("Marksheet not found for this Student ID.");
        } else {
          setMarksheet(result);
          setStatus(result.isUploaded ? "Marksheet already finalized." : "Marksheet ready for final approval.");
        }
      } catch (err) {
        console.error("Error fetching marksheet:", err);
        setStatus("Error fetching marksheet.");
      }
    };
    fetchMarksheet();
  }, [studentId, contract]);

  const handleFinalize = async () => {
    if (!isDean || !marksheet || marksheet.isUploaded) return;
    try {
      await contract.methods.finalUpload(studentId).send({ from: account });
      setStatus("✅ Marksheet finalized and uploaded.");
      setStudentId("");
      setMarksheet(null);
      fetchAllStudents(); // update lists instantly
    } catch (err) {
      console.error("Final upload failed:", err);
      setStatus("❌ Final upload failed.");
    }
  };

  const fetchAllStudents = async () => {
    if (!contract) return;
    try {
      const length = await contract.methods.studentListLength().call();
      const finalized = [];
      const notFinalized = [];

      const seen = new Set(); // prevent duplicates
      for (let i = 0; i < length; i++) {
        const id = await contract.methods.studentList(i).call();
        if (seen.has(id)) continue;
        seen.add(id);

        const m = await contract.methods.viewMarksheet(id).call();
        if (m.professorAddress === zeroAddress) continue;

        const studentData = {
          studentId: m.studentId,
          marks: m.marks,
          professorAddress: m.professorAddress,
          isValidated: m.isValidated,
          validatedBy: m.validatedBy,
          timestamp: m.timestamp,
          isUploaded: m.isUploaded,
        };

        if (m.isUploaded) {
          finalized.push(studentData);
        } else {
          notFinalized.push(studentData);
        }
      }

      setFinalizedStudents(finalized);
      setNotFinalizedStudents(notFinalized);
    } catch (err) {
      console.error("Error fetching student data:", err);
    }
  };

  const toggleAndFetch = (type) => {
    if (type === "finalized") {
      if (!showFinalized) fetchAllStudents();
      setShowFinalized(!showFinalized);
    } else {
      if (!showNotFinalized) fetchAllStudents();
      setShowNotFinalized(!showNotFinalized);
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

      {marksheet && (
        <div className="marksheet-details">
          <h4>Marksheet Details (from blockchain)</h4>
          <p><strong>Student ID:</strong> {marksheet.studentId}</p>
          <p><strong>Marks:</strong> {marksheet.marks}</p>
          <p><strong>Professor Address:</strong> {marksheet.professorAddress}</p>
          <p><strong>Validated:</strong> {marksheet.isValidated ? "Yes" : "No"}</p>
          <p><strong>Validated By:</strong> {marksheet.validatedBy}</p>
          <p><strong>Validation Timestamp:</strong> {marksheet.timestamp}</p>
          <p><strong>Finalized:</strong> {marksheet.isUploaded ? "Yes" : "No"}</p>
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

      <div className="lists-container">
        {/* Not Finalized */}
        <div className="list-box">
          <button onClick={() => toggleAndFetch("notFinalized")}>
            {showNotFinalized ? "Hide" : "Show"} Not Finalized Students {showNotFinalized ? "▲" : "▼"}
          </button>
          {showNotFinalized && notFinalizedStudents.length > 0 && (
            <table className="uploaded-students-table">
              <thead>
                <tr>
                  <th>Student ID</th>
                  <th>Marks</th>
                  <th>Professor</th>
                  <th>Validated</th>
                </tr>
              </thead>
              <tbody>
                {notFinalizedStudents.map((s, i) => (
                  <tr key={i}>
                    <td>{s.studentId}</td>
                    <td>{s.marks}</td>
                    <td>{s.professorAddress}</td>
                    <td>{s.isValidated ? "✅" : "❌"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {showNotFinalized && notFinalizedStudents.length === 0 && <p>No pending marksheets.</p>}
        </div>

        {/* Finalized */}
        <div className="list-box">
          <button onClick={() => toggleAndFetch("finalized")}>
            {showFinalized ? "Hide" : "Show"} Finalized Students {showFinalized ? "▲" : "▼"}
          </button>
          {showFinalized && finalizedStudents.length > 0 && (
            <table className="uploaded-students-table">
              <thead>
                <tr>
                  <th>Student ID</th>
                  <th>Marks</th>
                  <th>Professor</th>
                  <th>Validated</th>
                </tr>
              </thead>
              <tbody>
                {finalizedStudents.map((s, i) => (
                  <tr key={i}>
                    <td>{s.studentId}</td>
                    <td>{s.marks}</td>
                    <td>{s.professorAddress}</td>
                    <td>{s.isValidated ? "✅" : "❌"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {showFinalized && finalizedStudents.length === 0 && <p>No finalized marksheets yet.</p>}
        </div>
      </div>
    </div>
  );
};

export default Dean;
