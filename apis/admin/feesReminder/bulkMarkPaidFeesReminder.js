const pool = require("../../../db/dbConnect");

async function bulkMarkPaidFeesReminder(req, res) {
  try {
    const { id: reminder_id } = req.params;
    const { user_ids, batch_id, is_paid } = req.body;

    const paid = is_paid ? 1 : 0;
    let targetUserIds = [];

    if (Array.isArray(user_ids) && user_ids.length > 0) {
      targetUserIds = user_ids;
    } else if (batch_id) {
      const [rows] = await pool.promise().query(
        `SELECT fra.user_id
         FROM tbl_fees_reminder_assigned fra
         JOIN users u ON u.Id = fra.user_id
         WHERE fra.reminder_id = ? AND u.tbl_batch = ?`,
        [reminder_id, batch_id]
      );
      targetUserIds = rows.map((r) => r.user_id);
    } else {
      return res.status(400).json({ success: false, message: "Provide user_ids or batch_id" });
    }

    if (targetUserIds.length === 0)
      return res.json({ success: true, message: "No students to update" });

    await pool.promise().query(
      `UPDATE tbl_fees_reminder_assigned
       SET is_paid = ?, paid_at = ?, marked_by = ?
       WHERE reminder_id = ? AND user_id IN (?)`,
      [paid, paid ? new Date() : null, req.user.id, reminder_id, targetUserIds]
    );

    res.json({ success: true, message: `Updated ${targetUserIds.length} student(s)` });
  } catch (err) {
    console.error("bulkMarkPaidFeesReminder:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
}

module.exports = { bulkMarkPaidFeesReminder };
