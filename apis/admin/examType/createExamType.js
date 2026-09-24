const pool = require("../../../db/dbConnect");
async function createExamType(req, res) {
  const { name, description } = req.body;
  if (!name)
    return res.status(400).json({ success: false, message: "Name required" });
  try {
    const [r] = await pool
      .promise()
      .query("INSERT INTO tbl_exam_type (name, description) VALUES (?, ?)", [
        name,
        description || null,
      ]);
    return res
      .status(200)
      .json({ success: true, message: "Exam type created", id: r.insertId });
  } catch (err) {
    console.error("Error createExamType:", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
}
module.exports = { createExamType };
