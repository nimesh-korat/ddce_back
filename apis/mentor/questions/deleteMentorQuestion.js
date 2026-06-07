const pool = require("../../../db/dbConnect");

async function deleteMentorQuestion(req, res) {
  const { id } = req.params;
  const mentor_id = req?.user?.id;

  if (!id) return res.status(400).json({ success: false, message: "Question ID required" });

  try {
    const [existing] = await pool.promise().query(
      "SELECT id, added_by FROM tbl_questions WHERE id = ? AND is_deleted = 0",
      [id]
    );
    if (existing.length === 0)
      return res.status(404).json({ success: false, message: "Question not found" });
    if (existing[0].added_by !== mentor_id)
      return res.status(403).json({ success: false, message: "You can only delete your own questions" });

    // Check if used in any test
    const [testCheck] = await pool.promise().query(
      `SELECT t.test_name FROM tbl_test_questions tq JOIN tbl_test t ON t.id = tq.test_id WHERE tq.question_id = ? AND t.is_deleted = 0`,
      [id]
    );
    if (testCheck.length > 0) {
      const names = testCheck.map((t) => t.test_name).join(", ");
      return res.status(400).json({
        success: false,
        message: `Cannot delete: question is used in test(s): ${names}. Remove it from those tests first.`,
      });
    }

    // Check if used in any practice assignment
    const [practiceCheck] = await pool.promise().query(
      `SELECT pa.title FROM tbl_practice_questions pq JOIN tbl_practice_assigned pa ON pa.id = pq.practice_assigned_id WHERE pq.question_id = ? AND pa.is_deleted = 0`,
      [id]
    );
    if (practiceCheck.length > 0) {
      const names = practiceCheck.map((p) => p.title).join(", ");
      return res.status(400).json({
        success: false,
        message: `Cannot delete: question is used in practice assignment(s): ${names}.`,
      });
    }

    await pool.promise().query("UPDATE tbl_questions SET is_deleted = 1 WHERE id = ?", [id]);
    return res.status(200).json({ success: true, message: "Question deleted successfully" });
  } catch (err) {
    console.error("Error deleteMentorQuestion:", err.message);
    return res.status(500).json({ success: false, message: "Something went wrong", details: err.message });
  }
}

module.exports = { deleteMentorQuestion };
