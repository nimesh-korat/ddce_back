const pool = require("../../db/dbConnect");

async function deletePractice(req, res) {
  const { id }  = req.params;
  const user_id = req?.user?.id;
  const role    = req?.user?.role;
  if (!user_id) return res.status(401).json({ success: false, message: "Unauthorized" });

  try {
    const [existing] = await pool.promise().query(
      "SELECT id, added_by FROM tbl_practice WHERE id = ? AND is_active = 1", [id]
    );
    if (existing.length === 0)
      return res.status(404).json({ success: false, message: "Practice not found" });
    if (role === 2 && existing[0].added_by !== user_id)
      return res.status(403).json({ success: false, message: "You can only delete your own practices" });

    await pool.promise().query("UPDATE tbl_practice SET is_active = 0 WHERE id = ?", [id]);
    return res.status(200).json({ success: true, message: "Practice deleted successfully" });
  } catch (err) {
    console.error("Error deletePractice:", err.message);
    return res.status(500).json({ success: false, message: "Something went wrong", details: err.message });
  }
}

module.exports = { deletePractice };
