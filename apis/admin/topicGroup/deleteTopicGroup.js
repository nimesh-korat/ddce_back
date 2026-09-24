const pool = require("../../../db/dbConnect");
async function deleteTopicGroup(req, res) {
  const { id } = req.params;
  try {
    // Unlink topics from this group before deleting
    await pool
      .promise()
      .query("UPDATE tbl_topic SET group_id = NULL WHERE group_id = ?", [id]);
    await pool
      .promise()
      .query("DELETE FROM tbl_topic_group WHERE id = ?", [id]);
    return res.status(200).json({ success: true, message: "Deleted" });
  } catch (err) {
    console.error("Error deleteTopicGroup:", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
}
module.exports = { deleteTopicGroup };
