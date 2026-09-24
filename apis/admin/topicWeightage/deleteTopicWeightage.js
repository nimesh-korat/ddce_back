const pool = require("../../../db/dbConnect");
async function deleteTopicWeightage(req, res) {
  const { id } = req.params;
  try {
    await pool
      .promise()
      .query("DELETE FROM tbl_topic_weightage WHERE id = ?", [id]);
    return res.status(200).json({ success: true, message: "Deleted" });
  } catch (err) {
    console.error("Error deleteTopicWeightage:", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
}
module.exports = { deleteTopicWeightage };
