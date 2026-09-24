const pool = require("../../../db/dbConnect");
async function getTopicGroups(req, res) {
  const { subject_id } = req.query;
  try {
    const cond = subject_id ? "WHERE g.tbl_subject = ?" : "";
    const params = subject_id ? [subject_id] : [];
    const [rows] = await pool.promise().query(
      `SELECT g.id, g.name, g.tbl_subject, g.created_at,
         s.Sub_Name AS subject_name,
         COUNT(t.Id) AS topic_count
       FROM tbl_topic_group g
       LEFT JOIN tbl_subject s ON s.Id = g.tbl_subject
       LEFT JOIN tbl_topic t   ON t.group_id = g.id
       ${cond}
       GROUP BY g.id
       ORDER BY g.tbl_subject, g.name`,
      params,
    );
    return res.status(200).json({ success: true, data: rows });
  } catch (err) {
    console.error("Error getTopicGroups:", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
}
module.exports = { getTopicGroups };
