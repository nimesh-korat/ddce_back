const pool = require("../../../db/dbConnect");
async function assignTopicToGroup(req, res) {
  const { topic_id, group_id } = req.body;
  if (!topic_id)
    return res
      .status(400)
      .json({ success: false, message: "topic_id required" });
  try {
    await pool
      .promise()
      .query("UPDATE tbl_topic SET group_id = ? WHERE Id = ?", [
        group_id || null,
        topic_id,
      ]);
    return res.status(200).json({ success: true, message: "Updated" });
  } catch (err) {
    console.error("Error assignTopicToGroup:", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
}
module.exports = { assignTopicToGroup };
