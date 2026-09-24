const pool = require("../../../db/dbConnect");
async function updateTopicGroup(req, res) {
  const { id } = req.params;
  const { name } = req.body;
  if (!name)
    return res.status(400).json({ success: false, message: "name required" });
  try {
    await pool
      .promise()
      .query("UPDATE tbl_topic_group SET name = ? WHERE id = ?", [name, id]);
    return res.status(200).json({ success: true, message: "Updated" });
  } catch (err) {
    console.error("Error updateTopicGroup:", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
}
module.exports = { updateTopicGroup };
