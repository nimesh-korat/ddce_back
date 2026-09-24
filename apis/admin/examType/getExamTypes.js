const pool = require("../../../db/dbConnect");
async function getExamTypes(req, res) {
  try {
    const [rows] = await pool
      .promise()
      .query("SELECT * FROM tbl_exam_type ORDER BY id ASC");
    return res.status(200).json({ success: true, data: rows });
  } catch (err) {
    console.error("Error getExamTypes:", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
}
module.exports = { getExamTypes };
