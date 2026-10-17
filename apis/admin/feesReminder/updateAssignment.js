const pool = require("../../../db/dbConnect");

async function updateAssignment(req, res) {
  try {
    const { id: reminder_id, user_id } = req.params;
    const { deadline, lock_after_minutes } = req.body;

    if (!deadline)
      return res
        .status(400)
        .json({ success: false, message: "Deadline is required" });

    const lockMins =
      lock_after_minutes !== undefined &&
      lock_after_minutes !== "" &&
      lock_after_minutes !== null
        ? parseInt(lock_after_minutes, 10)
        : null;

    const [result] = await pool.promise().query(
      `UPDATE tbl_fees_reminder_assigned
       SET deadline = ?, lock_after_minutes = ?
       WHERE reminder_id = ? AND user_id = ?`,
      [deadline, lockMins, reminder_id, user_id],
    );

    if (result.affectedRows === 0)
      return res
        .status(404)
        .json({ success: false, message: "Assignment not found" });

    res.json({ success: true, message: "Assignment updated" });
  } catch (err) {
    console.error("updateAssignment:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
}

module.exports = { updateAssignment };
