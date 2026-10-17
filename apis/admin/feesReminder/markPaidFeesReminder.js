const pool = require("../../../db/dbConnect");

async function markPaidFeesReminder(req, res) {
  try {
    const { id: reminder_id } = req.params;
    const { user_id, is_paid } = req.body;

    if (user_id === undefined || is_paid === undefined)
      return res.status(400).json({ success: false, message: "user_id and is_paid are required" });

    const paid = is_paid ? 1 : 0;
    await pool.promise().query(
      `UPDATE tbl_fees_reminder_assigned
       SET is_paid = ?, paid_at = ?, marked_by = ?
       WHERE reminder_id = ? AND user_id = ?`,
      [paid, paid ? new Date() : null, req.user.id, reminder_id, user_id]
    );

    res.json({ success: true, message: paid ? "Marked as paid" : "Marked as unpaid" });
  } catch (err) {
    console.error("markPaidFeesReminder:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
}

module.exports = { markPaidFeesReminder };
