const pool = require("../../../db/dbConnect");

async function getStudentCounts(req, res) {
  try {
    const [rows] = await pool.promise().query(
      `SELECT sc.id, sc.tbl_batch, sc.tbl_phase,
         sc.offline_count, sc.online_count, sc.updated_on,
         b.batch_title, p.title AS phase_title
       FROM tbl_student_count sc
       LEFT JOIN tbl_batch b ON b.id  = sc.tbl_batch
       LEFT JOIN tbl_phase p ON p.Id  = sc.tbl_phase
       ORDER BY sc.tbl_batch IS NULL DESC, b.batch_title ASC, sc.tbl_phase ASC`,
    );
    return res.status(200).json({ success: true, data: rows });
  } catch (err) {
    console.error("Error getStudentCounts:", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
}
module.exports = { getStudentCounts };
