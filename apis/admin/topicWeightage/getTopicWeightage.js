const pool = require("../../../db/dbConnect");
async function getTopicWeightage(req, res) {
  const { topic_id } = req.params;
  try {
    const [rows] = await pool.promise().query(
      `SELECT id, topic_id, year, weightage
       FROM tbl_topic_weightage
       WHERE topic_id = ?
       ORDER BY year ASC`,
      [topic_id],
    );
    return res.status(200).json({ success: true, data: rows });
  } catch (err) {
    console.error("Error getTopicWeightage:", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
}
module.exports = { getTopicWeightage };
