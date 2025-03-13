const pool = require("../../../db/dbConnect");

async function getTestWiseBatch(req, res) {
  try {
    const { test_id } = req.body;

    if (!test_id) {
      return res.status(400).json({
        success: false,
        message: "Test ID is required.",
      });
    }

    const sql = `
            SELECT
    ta.id AS assigned_batch_id,
    b.id AS batch_id, 
    b.batch_title AS batch_name, 
    p.id AS phase_id,
    p.title AS phase_name,  -- Fetching phase name
    ta.start_date, 
    ta.end_date, 
    ta.isFeatured
FROM tbl_test_assigned ta
JOIN tbl_batch b ON ta.tbl_batch = b.id
JOIN tbl_phase p ON ta.tbl_phase = p.id  -- Joining tbl_phase to get phase_name
WHERE ta.tbl_test = ?;
        `;

    // Execute the query using the connection pool
    const [results] = await pool.promise().query(sql, [test_id]);

    if (results.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No batch assigned to this test.",
      });
    }

    return res.status(200).json({
      success: true,
      data: results,
    });
  } catch (err) {
    console.error("Error getTestWiseBatch:", err.message);
    return res.status(500).json({
      success: false,
      message: "Error processing request",
      details: err.message,
    });
  }
}

module.exports = { getTestWiseBatch };
