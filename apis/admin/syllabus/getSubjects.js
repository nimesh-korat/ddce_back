const pool = require("../../../db/dbConnect");

async function getSubjects(req, res) {
  try {
    // Try to join exam_type; fall back to plain select if column doesn't exist
    let results;
    try {
      [results] = await pool.promise().query(
        `SELECT s.*, e.name AS exam_type_name,
                        tt.PaperName AS test_type_name
                 FROM tbl_subject s
                 LEFT JOIN tbl_exam_type e ON e.id = s.exam_type_id
                 LEFT JOIN tbl_test_type tt ON tt.Id = s.tbl_test_type
                 ORDER BY s.Id ASC`,
      );
    } catch (_) {
      [results] = await pool
        .promise()
        .query(`SELECT * FROM tbl_subject ORDER BY Id ASC`);
    }

    if (results.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No subjects found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: results,
    });
  } catch (err) {
    console.error("Error getSubjects:", err.message);
    return res.status(500).json({
      success: false,
      message: "Error processing request",
      details: err.message,
    });
  }
}

module.exports = { getSubjects };
