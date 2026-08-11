const pool = require("../../../db/dbConnect");

async function getAttendanceUploads(req, res) {
  try {
    const [rows] = await pool.promise().query(
      `SELECT
         a.upload_batch_id,
         MIN(a.session_date)  AS session_date,
         MIN(a.topic_name)    AS topic_name,
         MIN(a.subject_id)    AS subject_id,
         s.Sub_Name           AS subject_name,
         COUNT(a.id)          AS total_students,
         MIN(a.marked_on)     AS uploaded_on,
         ad.Name              AS uploaded_by
       FROM tbl_attendance a
       LEFT JOIN tbl_subject s  ON s.Id  = a.subject_id
       LEFT JOIN admin ad       ON ad.Id = a.marked_by
       GROUP BY a.upload_batch_id, s.Sub_Name, ad.Name
       ORDER BY MIN(a.marked_on) DESC`,
    );
    return res.status(200).json({ success: true, data: rows });
  } catch (err) {
    console.error("Error getAttendanceUploads:", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
}
module.exports = { getAttendanceUploads };
