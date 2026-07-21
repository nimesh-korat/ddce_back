const pool = require("../../../db/dbConnect");

async function removeAssignment(req, res) {
  const { id } = req.params;
  try {
    await pool.promise().query("DELETE FROM tbl_doodle_assigned WHERE id = ?", [id]);
    return res.status(200).json({ success: true, message: "Assignment removed" });
  } catch (err) {
    console.error("Error removeAssignment:", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
}
module.exports = { removeAssignment };