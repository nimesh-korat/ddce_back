const pool = require("../../../db/dbConnect");

async function removeFeesAssignment(req, res) {
  try {
    const { id: reminder_id, user_id } = req.params;
    await pool.promise().query(
      "DELETE FROM tbl_fees_reminder_assigned WHERE reminder_id = ? AND user_id = ?",
      [reminder_id, user_id]
    );
    res.json({ success: true, message: "Assignment removed" });
  } catch (err) {
    console.error("removeFeesAssignment:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
}

module.exports = { removeFeesAssignment };
