const pool = require("../../../db/dbConnect");
async function upsertTopicWeightage(req, res) {
  const { topic_id } = req.params;
  const { year, weightage } = req.body;
  if (!year)
    return res.status(400).json({ success: false, message: "Year required" });
  if (year < 2015 || year > 2025)
    return res
      .status(400)
      .json({ success: false, message: "Year must be between 2015 and 2025" });
  try {
    await pool.promise().query(
      `INSERT INTO tbl_topic_weightage (topic_id, year, weightage)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE weightage = VALUES(weightage)`,
      [topic_id, year, weightage ?? null],
    );
    return res
      .status(200)
      .json({ success: true, message: "Saved successfully" });
  } catch (err) {
    console.error("Error upsertTopicWeightage:", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
}
module.exports = { upsertTopicWeightage };
