const pool = require("../../../db/dbConnect");

async function bulkUpdateAssignment(req, res) {
  try {
    const { id: reminder_id } = req.params;
    const { user_ids, deadline, lock_after_minutes } = req.body;

    if (!deadline)
      return res
        .status(400)
        .json({ success: false, message: "Deadline is required" });
    if (!Array.isArray(user_ids) || user_ids.length === 0)
      return res
        .status(400)
        .json({ success: false, message: "No students selected" });

    const lockMins =
      lock_after_minutes !== undefined &&
      lock_after_minutes !== "" &&
      lock_after_minutes !== null
        ? parseInt(lock_after_minutes, 10)
        : null;

    const [result] = await pool.promise().query(
      `UPDATE tbl_fees_reminder_assigned
       SET deadline = ?, lock_after_minutes = ?
       WHERE reminder_id = ? AND user_id IN (?)`,
      [deadline, lockMins, reminder_id, user_ids],
    );

    res.json({
      success: true,
      message: `Updated ${result.affectedRows} assignment(s)`,
    });
  } catch (err) {
    console.error("bulkUpdateAssignment:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
}

module.exports = { bulkUpdateAssignment };
