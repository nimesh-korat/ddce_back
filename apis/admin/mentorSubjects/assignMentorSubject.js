const pool = require("../../../db/dbConnect");

async function assignMentorSubject(req, res) {
  const { mentor_id, subject_id } = req.body;
  const assigned_by = req?.user?.id;
  if (!mentor_id || !subject_id)
    return res
      .status(400)
      .json({ success: false, message: "mentor_id and subject_id required" });
  try {
    await pool.promise().query(
      `INSERT INTO tbl_mentor_subject (mentor_id, subject_id, assigned_by)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE assigned_by = VALUES(assigned_by)`,
      [mentor_id, subject_id, assigned_by],
    );
    return res
      .status(200)
      .json({ success: true, message: "Subject assigned to mentor" });
  } catch (err) {
    console.error("Error assignMentorSubject:", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
}
module.exports = { assignMentorSubject };
