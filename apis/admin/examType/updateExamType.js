const pool = require("../../../db/dbConnect");
async function updateExamType(req, res) {
  const { id } = req.params;
  const { name, description } = req.body;
  if (!name)
    return res.status(400).json({ success: false, message: "Name required" });
  try {
    await pool
      .promise()
      .query(
        "UPDATE tbl_exam_type SET name = ?, description = ? WHERE id = ?",
        [name, description || null, id],
      );
    return res
      .status(200)
      .json({ success: true, message: "Updated successfully" });
  } catch (err) {
    console.error("Error updateExamType:", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
}
module.exports = { updateExamType };
