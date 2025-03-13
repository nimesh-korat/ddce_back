const pool = require("../../../db/dbConnect");

async function getActiveScheduleForStudent(req, res) {
  const std_id = req?.user?.id;
  const batch_id = req?.user?.Batch;
  const phase_id = req?.user?.Phase;

  if (!std_id || !batch_id || !phase_id) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized or missing batch or phase ID",
    });
  }

  try {
    // SQL query to fetch both session and test details
    const sql = `
                  SELECT 
                sa.start_date,
                sa.end_date,
                s.description AS description, 
                'Session' AS type,
                s.for_who AS for_who,
                s.link AS session_link
            FROM tbl_session_assigned sa
            INNER JOIN tbl_session s ON sa.tbl_session = s.id
            INNER JOIN tbl_phase p ON sa.tbl_phase = p.id
            INNER JOIN tbl_batch b ON sa.tbl_batch = b.id
            WHERE sa.tbl_batch = ? 
            AND sa.tbl_phase = ? 
            AND sa.is_featured = 1
              
            UNION ALL
              
            SELECT 
                ta.start_date,
                ta.end_date,
                t.test_name AS description, 
                'Test' AS type,
                t.for_who AS for_who,
                NULL AS session_link  -- Add NULL to match columns
            FROM tbl_test_assigned ta
            INNER JOIN tbl_test t ON ta.tbl_test = t.id
            INNER JOIN tbl_phase p ON ta.tbl_phase = p.id
            INNER JOIN tbl_batch b ON ta.tbl_batch = b.id
            LEFT JOIN tbl_test_questions ttq ON t.id = ttq.test_id
            WHERE ta.tbl_batch = ? 
            AND ta.tbl_phase = ? 
            AND ta.isFeatured = '1'
            GROUP BY t.id, ta.start_date, ta.end_date
            HAVING COUNT(ttq.question_id) >= 5
            ORDER BY start_date DESC;
    `;

    // Execute the query with batch and phase as parameters
    const [records] = await pool
      .promise()
      .query(sql, [batch_id, phase_id, batch_id, phase_id]);

    if (records.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No sessions or tests found for the given batch and phase",
      });
    }

    // Add serial numbers to the results
    const responseData = records.map((record, index) => ({
      sr_no: index + 1,
      start_date: record.start_date,
      end_date: record.end_date,
      description: record.description,
      type: record.type,
      for_who: record.for_who,
      session_link: record.session_link,
    }));

    return res.status(200).json({
      success: true,
      message: "Schedule details fetched successfully",
      data: responseData,
    });
  } catch (err) {
    console.error("Error fetching schedule details:", err.message);
    return res.status(500).json({
      success: false,
      error: "Database error",
      details: err.message,
    });
  }
}

module.exports = { getActiveScheduleForStudent };
