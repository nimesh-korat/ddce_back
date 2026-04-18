const pool = require("../../../db/dbConnect");

async function deleteTestQuestion(req, res) {
  const { test_id, question_id } = req.params;

  if (!test_id || !question_id) {
    return res
      .status(400)
      .json({ success: false, message: "test_id and question_id are required" });
  }

  try {
    // Check if any student has submitted this test
    const [submittedCheck] = await pool
      .promise()
      .query(
        "SELECT id FROM tbl_final_result WHERE test_id = ? LIMIT 1",
        [test_id]
      );

    if (submittedCheck.length > 0) {
      return res.status(400).json({
        success: false,
        message:
          "Cannot remove: students have already submitted this test. Removing questions would corrupt results.",
      });
    }

    // Check the mapping exists
    const [existing] = await pool
      .promise()
      .query(
        "SELECT id FROM tbl_test_questions WHERE test_id = ? AND question_id = ?",
        [test_id, question_id]
      );

    if (existing.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Question not found in this test" });
    }

    // Remove from test
    await pool
      .promise()
      .query(
        "DELETE FROM tbl_test_questions WHERE test_id = ? AND question_id = ?",
        [test_id, question_id]
      );

    return res.status(200).json({
      success: true,
      message: "Question removed from test successfully",
    });
  } catch (err) {
    console.error("Error processing deleteTestQuestion:", err.message);
    return res.status(500).json({
      success: false,
      message: "Something went wrong",
      details: err.message,
    });
  }
}

module.exports = { deleteTestQuestion };
