import React, { useState, useContext, useEffect } from "react";
import { Web3Context } from "../contexts/Web3Context";

const Professor = () => {
  const { contract, account } = useContext(Web3Context);
  const [studentId, setStudentId] = useState("");
  const [marks, setMarks] = useState("");
  const [status, setStatus] = useState("");
  const [isProfessor, setIsProfessor] = useState(false);

  useEffect(() => {
    const checkRole = async () => {
      if (!contract || !account) {
        setIsProfessor(false);
        return;
      }
      try {
        const result = await contract.methods.isProfessor(account).call();
        setIsProfessor(result);
      } catch (err) {
        console.error("Role check failed:", err);
        setIsProfessor(false);
      }
    };
    checkRole();
  }, [contract, account]);

  const handleUpload = async () => {
    if (!isProfessor) {
      setStatus("❌ Only a professor is authorized to upload marksheet.");
      return;
    }

    if (!studentId || !marks) {
      alert("Please fill all fields");
      return;
    }
    try {
      await contract.methods.upload(studentId, marks).send({ from: account });
      setStatus("✅ Marksheet uploaded successfully!");
    } catch (err) {
      console.error(err);
      setStatus("❌ Error uploading marksheet.");
    }
  };

  return (
    <div className="form-box">
      <h3>Professor Panel</h3>
      <p>Connected as: {account || "Not connected"}</p>
      <input
        type="number"
        placeholder="Student ID"
        value={studentId}
        onChange={(e) => setStudentId(e.target.value)}
      />
      <input
        type="number"
        placeholder="Marks"
        value={marks}
        onChange={(e) => setMarks(e.target.value)}
      />
      <button onClick={handleUpload} disabled={!isProfessor}>
        Upload Marksheet
      </button>
      {!isProfessor && <p style={{ color: "red" }}>Only a professor can upload marksheets.</p>}
      <p>{status}</p>
    </div>
  );
};

export default Professor;
