const pool = require("../../../db/dbConnect");

async function assignDoodle(req, res) {
  const { doodle_id, tbl_batch, tbl_phase } = req.body;
  if (!doodle_id) return res.status(400).json({ success: false, message: "doodle_id required" });
  try {
    await pool.promise().query(
      `INSERT IGNORE INTO tbl_doodle_assigned (doodle_id, tbl_batch, tbl_phase) VALUES (?, ?, ?)`,
      [doodle_id, tbl_batch || null, tbl_phase || null]
    );
    return res.status(201).json({ success: true, message: "Doodle assigned" });
  } catch (err) {
    console.error("Error assignDoodle:", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
}
module.exports = { assignDoodle };