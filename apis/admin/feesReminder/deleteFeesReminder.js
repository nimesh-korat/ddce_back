const pool = require("../../../db/dbConnect");

async function deleteFeesReminder(req, res) {
  try {
    const { id } = req.params;
    await pool.promise().query("DELETE FROM tbl_fees_reminder_assigned WHERE reminder_id = ?", [id]);
    await pool.promise().query("DELETE FROM tbl_fees_reminder WHERE id = ?", [id]);
    res.json({ success: true, message: "Reminder deleted" });
  } catch (err) {
    console.error("deleteFeesReminder:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
}

module.exports = { deleteFeesReminder };
