const pool = require("../../../db/dbConnect");

async function getSessionWiseBatch(req, res) {
  try {
    const { session_id } = req.body;

    if (!session_id) {
      return res.status(400).json({
        success: false,
        message: "Session ID is required.",
      });
    }

    const sql = `
            SELECT
            tsa.Id AS assigned_session_id,
                b.id AS batch_id, 
                b.batch_title AS batch_name, 
                tsa.start_date, 
                tsa.end_date, 
                tsa.is_featured
            FROM tbl_session_assigned tsa
            JOIN tbl_batch b ON tsa.tbl_batch = b.id
            WHERE tsa.tbl_session = ?;
        `;

    // Execute the query using the connection pool
    const [results] = await pool.promise().query(sql, [session_id]);

    if (results.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No session assigned to this session.",
      });
    }

    return res.status(200).json({
      success: true,
      data: results,
    });
  } catch (err) {
    console.error("Error getSessionWiseBatch:", err.message);
    return res.status(500).json({
      success: false,
      message: "Error processing request",
      details: err.message,
    });
  }
}

module.exports = { getSessionWiseBatch };
