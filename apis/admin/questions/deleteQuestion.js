const pool = require("../../../db/dbConnect");

async function deleteQuestion(req, res) {
  const { id } = req.params;

  if (!id) {
    return res
      .status(400)
      .json({ success: false, message: "Question ID is required" });
  }

  try {
    // Check the question exists
    const [existing] = await pool
      .promise()
      .query(
        "SELECT id FROM tbl_questions WHERE id = ? AND is_deleted = 0",
        [id]
      );

    if (existing.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Question not found" });
    }

    // Check if question is part of any active test
    const [testCheck] = await pool.promise().query(
      `SELECT tq.test_id, t.test_name
       FROM tbl_test_questions tq
       JOIN tbl_test t ON t.id = tq.test_id
       WHERE tq.question_id = ? AND t.is_deleted = 0`,
      [id]
    );

    if (testCheck.length > 0) {
      const testNames = testCheck.map((t) => t.test_name).join(", ");
      return res.status(400).json({
        success: false,
        message: `Cannot delete: question is used in test(s): ${testNames}. Remove it from those tests first.`,
      });
    }

    // Soft delete the question
    await pool
      .promise()
      .query("UPDATE tbl_questions SET is_deleted = 1 WHERE id = ?", [id]);

    return res.status(200).json({
      success: true,
      message: "Question deleted successfully",
    });
  } catch (err) {
    console.error("Error processing deleteQuestion:", err.message);
    return res.status(500).json({
      success: false,
      message: "Something went wrong",
      details: err.message,
    });
  }
}

module.exports = { deleteQuestion };
