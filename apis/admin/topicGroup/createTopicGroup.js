const pool = require("../../../db/dbConnect");
async function createTopicGroup(req, res) {
  const { name, tbl_subject } = req.body;
  if (!name || !tbl_subject)
    return res
      .status(400)
      .json({ success: false, message: "name and tbl_subject required" });
  try {
    const [r] = await pool
      .promise()
      .query("INSERT INTO tbl_topic_group (name, tbl_subject) VALUES (?, ?)", [
        name,
        tbl_subject,
      ]);
    return res
      .status(200)
      .json({ success: true, message: "Group created", id: r.insertId });
  } catch (err) {
    console.error("Error createTopicGroup:", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
}
module.exports = { createTopicGroup };
