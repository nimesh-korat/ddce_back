const pool = require("../../../db/dbConnect");

async function assignFeesReminder(req, res) {
  try {
    const { id: reminder_id } = req.params;
    const { assign_type, batch_id, student_ids, deadline, lock_after_minutes } = req.body;

    if (!deadline)
      return res.status(400).json({ success: false, message: "Deadline is required" });

    const [[reminder]] = await pool.promise().query(
      "SELECT * FROM tbl_fees_reminder WHERE id = ?", [reminder_id]
    );
    if (!reminder)
      return res.status(404).json({ success: false, message: "Reminder not found" });

    let userIds = [];

    if (assign_type === "batch" && batch_id) {
      const [students] = await pool.promise().query(
        "SELECT Id FROM users WHERE tbl_batch = ? AND Role = 0", [batch_id]
      );
      userIds = students.map((s) => s.Id);
    } else if (assign_type === "students" && Array.isArray(student_ids) && student_ids.length > 0) {
      userIds = student_ids;
    } else {
      return res.status(400).json({ success: false, message: "Provide batch_id or student_ids" });
    }

    if (userIds.length === 0)
      return res.status(400).json({ success: false, message: "No students found to assign" });

    const lockMins = reminder.lock_portal ? (lock_after_minutes ?? null) : null;
    const values = userIds.map((uid) => [reminder_id, uid, deadline, lockMins]);

    await pool.promise().query(
      `INSERT INTO tbl_fees_reminder_assigned (reminder_id, user_id, deadline, lock_after_minutes)
       VALUES ?
       ON DUPLICATE KEY UPDATE deadline = VALUES(deadline), lock_after_minutes = VALUES(lock_after_minutes)`,
      [values]
    );

    res.json({ success: true, message: `Assigned to ${userIds.length} student(s)` });
  } catch (err) {
    console.error("assignFeesReminder:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
}

module.exports = { assignFeesReminder };
