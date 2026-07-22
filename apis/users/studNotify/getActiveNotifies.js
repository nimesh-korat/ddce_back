const pool = require("../../../db/dbConnect");

async function getActiveNotifies(req, res) {
  const batch_id = req?.user?.Batch || null;
  const phase_id = req?.user?.Phase || null;

  try {
    const [rows] = await pool.promise().query(
      `SELECT id, name, college_name, mode,
         CONVERT_TZ(join_datetime, "+00:00", "+05:30") AS join_datetime
       FROM stud_notify_admin
       WHERE NOW() BETWEEN feature_datetime_start AND feature_datetime_end
         AND join_datetime <= NOW()
         AND (
           (tbl_batch IS NULL AND tbl_phase IS NULL)
           OR (tbl_batch = ? AND tbl_phase IS NULL)
           OR (tbl_batch IS NULL AND tbl_phase = ?)
           OR (tbl_batch = ? AND tbl_phase = ?)
         )
       ORDER BY feature_datetime_start ASC`,
      [batch_id, phase_id, batch_id, phase_id],
    );
    return res.status(200).json({ success: true, data: rows });
  } catch (err) {
    console.error("getActiveNotifies error:", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
}
module.exports = { getActiveNotifies };
