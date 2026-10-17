const pool = require("../../../db/dbConnect");

async function getFeesReminderStudents(req, res) {
  try {
    const { id: reminder_id } = req.params;
    const { batch_id, phase_id } = req.query;

    let where = "fra.reminder_id = ?";
    const params = [reminder_id];

    if (batch_id) {
      where += " AND u.tbl_batch = ?";
      params.push(batch_id);
    }
    if (phase_id) {
      where += " AND u.tbl_phase = ?";
      params.push(phase_id);
    }

    const [students] = await pool.promise().query(
      `SELECT fra.id, fra.user_id, fra.deadline, fra.lock_after_minutes,
              fra.is_paid, fra.paid_at, fra.created_at,
              u.Name, u.Email_Id, u.Phone_Number,
              b.batch_title,
              p.title AS phase_title,
              admin.Name AS marked_by_name
       FROM tbl_fees_reminder_assigned fra
       JOIN users u ON u.Id = fra.user_id
       LEFT JOIN tbl_batch b ON b.id = u.tbl_batch
       LEFT JOIN tbl_phase p ON p.Id = u.tbl_phase
       LEFT JOIN users admin ON admin.Id = fra.marked_by
       WHERE ${where}
       ORDER BY b.batch_title, u.Name`,
      params,
    );

    res.json({ success: true, data: students });
  } catch (err) {
    console.error("getFeesReminderStudents:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
}

module.exports = { getFeesReminderStudents };
