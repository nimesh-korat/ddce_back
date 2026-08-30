const pool = require("../../../db/dbConnect");

async function removeMentorSubject(req, res) {
  const { id } = req.params;
  try {
    await pool
      .promise()
      .query("DELETE FROM tbl_mentor_subject WHERE id = ?", [id]);
    return res.status(200).json({ success: true, message: "Mapping removed" });
  } catch (err) {
    console.error("Error removeMentorSubject:", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
}
module.exports = { removeMentorSubject };
