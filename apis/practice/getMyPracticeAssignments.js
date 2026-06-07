const pool = require("../../db/dbConnect");

async function getMyPracticeAssignments(req, res) {
  const assigned_by = req?.user?.id;
  const role = req?.user?.role;

  if (!assigned_by) return res.status(401).json({ success: false, message: "Unauthorized" });

  try {
    // Admin sees all assignments; mentor sees only own
    const whereClause = role === 1 ? "pa.is_deleted = 0" : "pa.assigned_by = ? AND pa.is_deleted = 0";
    const params = role === 1 ? [] : [assigned_by];

    const sql = `
      SELECT
        pa.id, pa.title, pa.tbl_batch, pa.tbl_phase,
        pa.start_date, pa.end_date, pa.created_at,
        b.batch_title,
        p.title AS phase_title,
        a.Name AS assigned_by_name,
        COUNT(pq.id) AS total_questions,
        CASE
          WHEN pa.start_date IS NOT NULL AND pa.start_date > NOW() THEN 'upcoming'
          WHEN pa.end_date IS NOT NULL AND pa.end_date < NOW() THEN 'ended'
          ELSE 'active'
        END AS status
      FROM tbl_practice_assigned pa
      LEFT JOIN tbl_batch b ON b.id = pa.tbl_batch
      LEFT JOIN tbl_phase p ON p.Id = pa.tbl_phase
      LEFT JOIN admin a ON a.Id = pa.assigned_by
      LEFT JOIN tbl_practice_questions pq ON pq.practice_assigned_id = pa.id
      WHERE ${whereClause}
      GROUP BY pa.id
      ORDER BY pa.created_at DESC
    `;
    const [results] = await pool.promise().query(sql, params);

    return res.status(200).json({ success: true, data: results });
  } catch (err) {
    console.error("Error getMyPracticeAssignments:", err.message);
    return res.status(500).json({ success: false, message: "Something went wrong", details: err.message });
  }
}

module.exports = { getMyPracticeAssignments };
