const pool = require("../../../db/dbConnect");

async function deleteAttendanceBatch(req, res) {
  const { batch_id } = req.params;
  try {
    const [result] = await pool
      .promise()
      .query("DELETE FROM tbl_attendance WHERE upload_batch_id = ?", [
        batch_id,
      ]);
    return res
      .status(200)
      .json({
        success: true,
        message: `Deleted ${result.affectedRows} records`,
      });
  } catch (err) {
    console.error("Error deleteAttendanceBatch:", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
}
module.exports = { deleteAttendanceBatch };
