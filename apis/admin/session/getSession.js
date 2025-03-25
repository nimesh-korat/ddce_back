const pool = require("../../../db/dbConnect");

async function getAllSession(req, res) {
  try {
    // Get all active sessions
    const sessionSql = `
      SELECT 
        s.Id,
        s.description,
        s.for_who,
        s.link,
        s.is_active,
        s.created_by,
        s.created_at,
        CASE 
          WHEN sa.tbl_session IS NOT NULL THEN true 
          ELSE false 
        END AS isAssigned
      FROM tbl_session s
      LEFT JOIN tbl_session_assigned sa ON s.Id = sa.tbl_session
      WHERE s.is_active = '1'
      GROUP BY s.Id
      ORDER BY s.created_at DESC
    `;

    const [sessions] = await pool.promise().query(sessionSql);

    if (sessions.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No active sessions found",
      });
    }

    const enrichedSessions = await Promise.all(
      sessions.map(async (session) => {
        let assignments = [];

        if (session.isAssigned) {
          const assignedSql = `
            SELECT
              p.Id AS phase_id,
              p.title AS phase_title,
              b.id AS batch_id,
              b.batch_title AS batch_title,
              sa.start_date AS assigned_start_date,
              sa.end_date AS assigned_end_date,
              sa.is_featured
            FROM tbl_session_assigned sa
            LEFT JOIN tbl_phase p ON p.Id = sa.tbl_phase
            LEFT JOIN tbl_batch b ON b.id = sa.tbl_batch
            WHERE sa.tbl_session = ?
          `;
          const [assignedData] = await pool
            .promise()
            .query(assignedSql, [session.Id]);

          assignments = assignedData.map((row) => ({
            phase: row.phase_id
              ? { id: row.phase_id, title: row.phase_title }
              : null,
            batch: row.batch_id
              ? { id: row.batch_id, title: row.batch_title }
              : null,
            start_date: row.assigned_start_date,
            end_date: row.assigned_end_date,
            is_featured: row.is_featured,
          }));
        }

        return {
          ...session,
          assignments,
        };
      })
    );

    return res.status(200).json({
      success: true,
      message: "Active sessions fetched successfully",
      data: enrichedSessions,
    });
  } catch (err) {
    console.error("Error fetching active sessions:", err.message);
    return res.status(500).json({
      success: false,
      error: "Database error",
      details: err.message,
    });
  }
}

module.exports = { getAllSession };
