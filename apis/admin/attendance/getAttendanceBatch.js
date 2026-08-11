const pool = require("../../../db/dbConnect");

async function getAttendanceBatch(req, res) {
  const { batch_id } = req.params;
  const batch_filter = req.query.batch_id || null;
  const phase_filter = req.query.phase_id || null;

  try {
    const conditions = ["a.upload_batch_id = ?"];
    const params = [batch_id];
    if (batch_filter) {
      conditions.push("u.tbl_batch = ?");
      params.push(batch_filter);
    }
    if (phase_filter) {
      conditions.push("u.tbl_phase = ?");
      params.push(phase_filter);
    }

    const [rows] = await pool.promise().query(
      `SELECT
         a.id, a.student_id, a.session_date, a.minutes, a.status, a.marked_on,
         u.Name AS student_name, u.Email_Id AS email,
         u.College_Name AS college,
         b.batch_title, p.title AS phase_title
       FROM tbl_attendance a
       JOIN users u         ON u.Id  = a.student_id
       LEFT JOIN tbl_batch b  ON b.id  = u.tbl_batch
       LEFT JOIN tbl_phase p  ON p.Id  = u.tbl_phase
       WHERE ${conditions.join(" AND ")}
       ORDER BY u.Name ASC`,
      params,
    );
    return res.status(200).json({ success: true, data: rows });
  } catch (err) {
    console.error("Error getAttendanceBatch:", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
}
module.exports = { getAttendanceBatch };
