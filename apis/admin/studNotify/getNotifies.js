const pool = require("../../../db/dbConnect");

async function getNotifies(req, res) {
  try {
    const [rows] = await pool.promise().query(
      `SELECT n.*, b.batch_title, p.title AS phase_title, a.Name AS added_by_name
       FROM stud_notify_admin n
       LEFT JOIN tbl_batch b ON b.id = n.tbl_batch
       LEFT JOIN tbl_phase p ON p.Id = n.tbl_phase
       LEFT JOIN admin a ON a.Id = n.added_by
       ORDER BY n.added_on DESC`,
    );
    return res.status(200).json({ success: true, data: rows });
  } catch (err) {
    console.error("getNotifies error:", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
}
module.exports = { getNotifies };
