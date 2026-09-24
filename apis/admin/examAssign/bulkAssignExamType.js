const pool = require("../../../db/dbConnect");
async function bulkAssignExamType(req, res) {
  const { student_ids, exam_type_id } = req.body;
  if (!student_ids?.length)
    return res
      .status(400)
      .json({ success: false, message: "No students selected" });
  try {
    const ph = student_ids.map(() => "?").join(",");
    await pool
      .promise()
      .query(`UPDATE users SET exam_type_id = ? WHERE Id IN (${ph})`, [
        exam_type_id || null,
        ...student_ids,
      ]);
    return res
      .status(200)
      .json({
        success: true,
        message: `Updated ${student_ids.length} student(s)`,
      });
  } catch (err) {
    console.error("Error bulkAssignExamType:", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
}
module.exports = { bulkAssignExamType };
