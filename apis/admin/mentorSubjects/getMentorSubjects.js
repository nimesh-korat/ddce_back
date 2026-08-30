const pool = require("../../../db/dbConnect");

async function getMentorSubjects(req, res) {
  try {
    const [rows] = await pool.promise().query(
      `SELECT ms.id, ms.mentor_id, ms.subject_id, ms.assigned_on,
         a.Name AS mentor_name, a.Phone AS mentor_phone,
         s.Sub_Name AS subject_name
       FROM tbl_mentor_subject ms
       JOIN admin a       ON a.Id  = ms.mentor_id
       JOIN tbl_subject s ON s.Id  = ms.subject_id
       ORDER BY a.Name ASC, s.Sub_Name ASC`,
    );
    return res.status(200).json({ success: true, data: rows });
  } catch (err) {
    console.error("Error getMentorSubjects:", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
}
module.exports = { getMentorSubjects };
