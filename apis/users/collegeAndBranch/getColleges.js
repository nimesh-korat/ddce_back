const pool = require("../../../db/dbConnect");

async function getColleges(req, res) {
  try {
    const sql = `SELECT DISTINCT category 
                     FROM ddcet_cutoff_2024 
                     WHERE category IS NOT NULL
                     ORDER BY category ASC`;

    // Execute the query using the connection pool
    const [results] = await pool.promise().query(sql);

    if (results.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No colleges found.",
      });
    }

    // Send the response with the formatted results
    return res.status(200).json({
      success: true,
      data: results,
    });
  } catch (err) {
    console.error("Error getColleges:", err.message);
    return res.status(500).json({
      success: false,
      message: "Error fetching colleges",
      details: err.message,
    });
  }
}

module.exports = { getColleges };
