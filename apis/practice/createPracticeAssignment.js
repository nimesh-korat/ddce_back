const pool = require("../../db/dbConnect");

// Assigns an existing practice to a batch (creates tbl_practice_assigned row)
async function createPracticeAssignment(req, res) {
  const user_id = req?.user?.id;
  const role    = req?.user?.role;
  if (!user_id) return res.status(401).json({ success: false, message: "Unauthorized" });

  const { practice_id, tbl_batch, tbl_phase, start_date, end_date } = req.body;

  if (!practice_id || !tbl_batch)
    return res.status(400).json({ success: false, message: "practice_id and tbl_batch are required" });

  try {
    // Verify practice exists and requester has rights
    const [practice] = await pool.promise().query(
      "SELECT id, added_by FROM tbl_practice WHERE id = ? AND is_active = 1", [practice_id]
    );
    if (practice.length === 0)
      return res.status(404).json({ success: false, message: "Practice not found" });
    if (role === 2 && practice[0].added_by !== user_id)
      return res.status(403).json({ success: false, message: "You can only assign your own practices" });

    // Prevent duplicate batch+phase assignment for same practice
    const [existing] = await pool.promise().query(
      `SELECT id FROM tbl_practice_assigned
       WHERE practice_id = ? AND tbl_batch = ? AND tbl_phase <=> ?`,
      [practice_id, tbl_batch, tbl_phase || null]
    );
    if (existing.length > 0)
      return res.status(409).json({
        success: false,
        message: "This practice is already assigned to this batch and phase",
      });

    await pool.promise().query(
      `INSERT INTO tbl_practice_assigned
         (practice_id, tbl_batch, tbl_phase, start_date, end_date, is_visible, is_featured, assigned_by)
       VALUES (?, ?, ?, ?, ?, 1, 1, ?)`,
      [practice_id, tbl_batch, tbl_phase || null, start_date || null, end_date || null, user_id]
    );

    return res.status(201).json({ success: true, message: "Practice assigned to batch successfully" });
  } catch (err) {
    console.error("Error createPracticeAssignment:", err.message);
    return res.status(500).json({ success: false, message: "Something went wrong", details: err.message });
  }
}

module.exports = { createPracticeAssignment };
