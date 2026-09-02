const pool = require("../../db/dbConnect");

async function editPracticeBatchAssignment(req, res) {
  const { id } = req.params;
  const { tbl_batch, tbl_phase, start_date, end_date } = req.body;

  if (!tbl_batch)
    return res.status(400).json({ success: false, message: "Batch is required" });

  try {
    await pool.promise().query(
      `UPDATE tbl_practice_assigned
       SET tbl_batch = ?, tbl_phase = ?, start_date = ?, end_date = ?
       WHERE id = ?`,
      [tbl_batch, tbl_phase || null, start_date || null, end_date || null, id]
    );
    return res.status(200).json({ success: true, message: "Assignment updated successfully" });
  } catch (err) {
    console.error("Error editPracticeBatchAssignment:", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
}
module.exports = { editPracticeBatchAssignment };