const pool = require("../../db/dbConnect");

async function deletePracticeAssignment(req, res) {
  const { id } = req.params;
  const user_id = req?.user?.id;
  const role = req?.user?.role;

  if (!id) return res.status(400).json({ success: false, message: "Assignment ID required" });

  try {
    const [existing] = await pool.promise().query(
      "SELECT id, assigned_by FROM tbl_practice_assigned WHERE id = ? AND is_deleted = 0",
      [id]
    );
    if (existing.length === 0)
      return res.status(404).json({ success: false, message: "Assignment not found" });

    // Mentor can only delete own; admin can delete any
    if (role === 2 && existing[0].assigned_by !== user_id) {
      return res.status(403).json({ success: false, message: "You can only delete your own assignments" });
    }

    await pool.promise().query(
      "UPDATE tbl_practice_assigned SET is_deleted = 1 WHERE id = ?", [id]
    );
    return res.status(200).json({ success: true, message: "Assignment deleted successfully" });
  } catch (err) {
    console.error("Error deletePracticeAssignment:", err.message);
    return res.status(500).json({ success: false, message: "Something went wrong", details: err.message });
  }
}

module.exports = { deletePracticeAssignment };
