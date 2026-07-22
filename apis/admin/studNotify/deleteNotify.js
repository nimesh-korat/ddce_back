const pool = require("../../../db/dbConnect");

async function deleteNotify(req, res) {
  const { id } = req.params;
  try {
    await pool
      .promise()
      .query("DELETE FROM stud_notify_admin WHERE id=?", [id]);
    return res.status(200).json({ success: true, message: "Deleted" });
  } catch (err) {
    console.error("deleteNotify error:", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
}
module.exports = { deleteNotify };
