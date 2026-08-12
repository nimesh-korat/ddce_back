const pool = require("../../../db/dbConnect");

async function getStudentCount(req, res) {
  const batch_id = req?.user?.Batch || null;
  const phase_id = req?.user?.Phase || null;

  try {
    const db = pool.promise();

    // Try batch+phase specific first
    if (batch_id) {
      const [[specific]] = await db.query(
        `SELECT offline_count, online_count FROM tbl_student_count
         WHERE tbl_batch = ? AND (tbl_phase = ? OR tbl_phase IS NULL)
         ORDER BY tbl_phase IS NOT NULL DESC LIMIT 1`,
        [batch_id, phase_id],
      );
      if (specific)
        return res.status(200).json({ success: true, data: specific });
    }

    // Fall back to global default (tbl_batch IS NULL)
    const [[global]] = await db.query(
      `SELECT offline_count, online_count FROM tbl_student_count
       WHERE tbl_batch IS NULL AND tbl_phase IS NULL LIMIT 1`,
    );

    return res.status(200).json({
      success: true,
      data: global || { offline_count: 0, online_count: 0 },
    });
  } catch (err) {
    console.error("Error getStudentCount:", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
}
module.exports = { getStudentCount };
