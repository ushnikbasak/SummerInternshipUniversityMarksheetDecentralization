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
      if (!contract || !account) return setIsDean(false);
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
      if (!studentId || !contract) return;
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
    if (!isDean || !marksheet || marksheet.isUploaded) return;
    try {
      await contract.methods.finalUpload(studentId).send({ from: account });
      setStatus("✅ Marksheet finalized and uploaded.");
      const updated = await contract.methods.viewMarksheet(studentId).call();
      setMarksheet(updated);
      fetchStudentLists(); // refresh
    } catch (err) {
      console.error("Final upload failed:", err);
      setStatus("❌ Final upload failed. See console.");
    }
  };

  const fetchStudentLists = async () => {
    if (!contract) return;

    try {
      const length = await contract.methods.studentListLength().call();
      const finalized = [];
      const notFinalized = [];

      const seen = new Set();

      for (let i = 0; i < length; i++) {
        const id = await contract.methods.studentList(i).call();

        if (seen.has(id)) continue;
        seen.add(id);

        const m = await contract.methods.viewMarksheet(id).call();
        if (m.professorAddress === zeroAddress) continue;

        if (m.isUploaded) {
          finalized.push({
            studentId: m.studentId,
            marks: m.marks,
            professorAddress: m.professorAddress,
            validatedBy: m.validatedBy,
            timestamp: m.timestamp,
          });
        } else if (m.isValidated && !m.isUploaded) {
          notFinalized.push(m.studentId);
        }
      }

      setFinalizedStudents(finalized);
      setNotFinalizedStudents(notFinalized);
    } catch (err) {
      console.error("Error fetching student lists:", err);
    }
  };

  return (
    <div className="form-box">
      <h3>Dean Panel</h3>
      <p>Connected as: {account || "Not connected"}</p>

      <input
        type="number"
        placeholder="Enter Student ID"
        value={studentId}
        onChange={(e) => setStudentId(e.target.value)}
      />

      {marksheet && marksheet.professorAddress !== zeroAddress && (
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

      <div className="list-box">
        {/* ✅ Not Finalized First */}
        <button
          className="collapsible-button"
          onClick={() => {
            setShowNotFinalized(!showNotFinalized);
            if (!showNotFinalized) fetchStudentLists();
          }}
        >
          ❌ Not Finalized Students {showNotFinalized ? "▲" : "▼"}
        </button>

        {showNotFinalized && (
          <table className="uploaded-students-table">
            <thead>
              <tr>
                <th>Student ID</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {notFinalizedStudents.length > 0 ? (
                notFinalizedStudents.map((id, i) => (
                  <tr key={i}>
                    <td>{id}</td>
                    <td>
                      <button onClick={() => setStudentId(id)}>
                        Show Details
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="2">No validated students pending finalization.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      <div className="list-box">
        <button
          className="collapsible-button"
          onClick={() => {
            setShowFinalized(!showFinalized);
            if (!showFinalized) fetchStudentLists();
          }}
        >
          ✅ Finalized Students {showFinalized ? "▲" : "▼"}
        </button>

        {showFinalized && finalizedStudents.length > 0 && (
            <table className="uploaded-students-table">
              <thead>
                <tr>
                  <th>Student ID</th>
                  <th>Marks</th>
                  <th>Professor</th>
                  <th>Validated By</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {finalizedStudents.map((s, i) => (
                  <tr key={i}>
                    <td>{s.studentId}</td>
                    <td>{s.marks}</td>
                    <td>{s.professorAddress}</td>
                    <td>{s.validatedBy}</td>
                    <td>{s.timestamp}</td>
                  </tr>
                ))}
              </tbody>
            </table>
        )}
      </div>
    </div>
  );
};

export default Dean;
