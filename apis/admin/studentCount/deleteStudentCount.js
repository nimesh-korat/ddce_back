const pool = require("../../../db/dbConnect");

async function deleteStudentCount(req, res) {
  const { id } = req.params;
  try {
    // Don't allow deleting the global default (tbl_batch IS NULL)
    const [[row]] = await pool
      .promise()
      .query("SELECT tbl_batch FROM tbl_student_count WHERE id = ?", [id]);
    if (!row)
      return res.status(404).json({ success: false, message: "Not found" });
    if (row.tbl_batch === null)
      return res
        .status(400)
        .json({ success: false, message: "Cannot delete the global default" });

    await pool
      .promise()
      .query("DELETE FROM tbl_student_count WHERE id = ?", [id]);
    return res
      .status(200)
      .json({ success: true, message: "Deleted successfully" });
  } catch (err) {
    console.error("Error deleteStudentCount:", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
}
module.exports = { deleteStudentCount };
