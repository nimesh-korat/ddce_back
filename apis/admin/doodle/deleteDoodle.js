const pool = require("../../../db/dbConnect");

async function deleteDoodle(req, res) {
  const { id } = req.params;
  try {
    await pool.promise().query("DELETE FROM tbl_doodle WHERE id = ?", [id]);
    return res.status(200).json({ success: true, message: "Doodle deleted" });
  } catch (err) {
    console.error("Error deleteDoodle:", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
}
module.exports = { deleteDoodle };