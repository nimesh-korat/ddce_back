const pool = require("../../db/dbConnect");

async function removeQuestionFromPractice(req, res) {
  const { id, question_id } = req.params;
  const user_id = req?.user?.id;
  const role    = req?.user?.role;
  if (!user_id) return res.status(401).json({ success: false, message: "Unauthorized" });

  try {
    const [practice] = await pool.promise().query(
      "SELECT id, added_by FROM tbl_practice WHERE id = ? AND is_active = 1", [id]
    );
    if (practice.length === 0)
      return res.status(404).json({ success: false, message: "Practice not found" });
    if (role === 2 && practice[0].added_by !== user_id)
      return res.status(403).json({ success: false, message: "Access denied" });

    await pool.promise().query(
      "DELETE FROM tbl_practice_questions WHERE practice_id = ? AND question_id = ?",
      [id, question_id]
    );

    return res.status(200).json({ success: true, message: "Question removed from practice" });
  } catch (err) {
    console.error("Error removeQuestionFromPractice:", err.message);
    return res.status(500).json({ success: false, message: "Something went wrong", details: err.message });
  }
}

module.exports = { removeQuestionFromPractice };
