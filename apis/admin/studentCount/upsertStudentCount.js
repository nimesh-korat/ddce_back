const pool = require("../../../db/dbConnect");

async function upsertStudentCount(req, res) {
  const { tbl_batch, tbl_phase, offline_count, online_count } = req.body;
  const updated_by = req?.user?.id;

  try {
    await pool.promise().query(
      `INSERT INTO tbl_student_count (tbl_batch, tbl_phase, offline_count, online_count, updated_by)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         offline_count = VALUES(offline_count),
         online_count  = VALUES(online_count),
         updated_by    = VALUES(updated_by)`,
      [
        tbl_batch || null,
        tbl_phase || null,
        offline_count || 0,
        online_count || 0,
        updated_by,
      ],
    );
    return res
      .status(200)
      .json({ success: true, message: "Saved successfully" });
  } catch (err) {
    console.error("Error upsertStudentCount:", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
}
module.exports = { upsertStudentCount };
