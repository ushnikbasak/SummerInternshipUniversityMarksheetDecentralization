import React, { useState, useContext, useEffect } from "react";
import { Web3Context } from "../contexts/Web3Context";

const Professor = () => {
  const { contract, account } = useContext(Web3Context);
  const [studentId, setStudentId] = useState("");
  const [marks, setMarks] = useState("");
  const [status, setStatus] = useState("");
  const [isProfessor, setIsProfessor] = useState(false);
  const [uploadedStudents, setUploadedStudents] = useState([]);

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

  const fetchMyUploadedStudents = async () => {
    console.log("Button clicked - fetching uploaded students...");
    if (!contract || !account) return;

    try {
      const length = await contract.methods.studentListLength().call();
      const results = [];

      for (let i = 0; i < length; i++) {
        const studentId = await contract.methods.studentList(i).call();
        const m = await contract.methods.viewMarksheet(studentId).call();

        if (m.professorAddress.toLowerCase() === account.toLowerCase()) {
          results.push({
            studentId: m.studentId,
            marks: m.marks,
            isValidated: m.isValidated,
            isUploaded: m.isUploaded
          });
        }
      }

      if (results.length === 0) {
        alert("❗ You haven't uploaded any marksheets.");
      }

      setUploadedStudents(results);
      
    } catch (err) {
      console.error("Error fetching uploaded students:", err.message);
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
      <button onClick={fetchMyUploadedStudents} disabled={!isProfessor}>
        View My Uploaded Students
      </button>

      {uploadedStudents.length > 0 && (
        <div className="uploaded-students-section">
          <h4>My Uploaded Students</h4>
          <table className="uploaded-students-table">
            <thead>
              <tr>
                <th>Student ID</th>
                <th>Marks</th>
                <th>Validated</th>
                <th>Final Uploaded</th>
              </tr>
            </thead>
            <tbody>
              {uploadedStudents.map((s, index) => (
                <tr key={index}>
                  <td>{s.studentId}</td>
                  <td>{s.marks}</td>
                  <td>{s.isValidated ? "✅" : "❌"}</td>
                  <td>{s.isUploaded ? "✅" : "❌"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Professor;
