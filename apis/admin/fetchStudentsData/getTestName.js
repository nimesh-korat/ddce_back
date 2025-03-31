const pool = require("../../../db/dbConnect");

async function getTestNames(req, res) {
  try {
    const sql = `SELECT Id AS test_id, test_name FROM tbl_test ORDER BY test_name ASC`;
    const [tests] = await pool.promise().query(sql);

    if (tests.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No tests found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Test names fetched successfully",
      data: tests,
    });
  } catch (err) {
    console.error("Error fetching test names:", err.message);
    return res.status(500).json({
      success: false,
      error: "Database error",
      details: err.message,
    });
  }
}

module.exports = { getTestNames };