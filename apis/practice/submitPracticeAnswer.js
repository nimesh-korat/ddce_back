const pool = require("../../db/dbConnect");

async function submitPracticeAnswer(req, res) {
  const student_id = req?.user?.id;
  if (!student_id)
    return res.status(401).json({ success: false, message: "Unauthorized" });

  const { practice_assigned_id, question_id, std_answer } = req.body;
  if (!practice_assigned_id || !question_id) {
    return res
      .status(400)
      .json({
        success: false,
        message: "practice_assigned_id and question_id are required",
      });
  }

  try {
    // Check not already answered
    const [existing] = await pool
      .promise()
      .query(
        "SELECT id FROM tbl_practice_answer WHERE practice_assigned_id = ? AND question_id = ? AND student_id = ?",
        [practice_assigned_id, question_id, student_id],
      );
    if (existing.length > 0) {
      return res
        .status(400)
        .json({ success: false, message: "Already answered this question" });
    }

    // Fetch question's correct answer and subject
    const [qData] = await pool.promise().query(
      `SELECT q.answer_text, q.answer_image, sub.Id AS subject_id
       FROM tbl_questions q
       LEFT JOIN tbl_subtopic st ON q.tbl_subtopic = st.Id
       LEFT JOIN tbl_topic t ON st.tbl_topic = t.Id
       LEFT JOIN tbl_subject sub ON t.tbl_subject = sub.Id
       WHERE q.id = ?`,
      [question_id],
    );
    if (qData.length === 0)
      return res
        .status(404)
        .json({ success: false, message: "Question not found" });

    const { answer_text, answer_image, subject_id } = qData[0];
    // Correct answer is text or image key
    const correct_answer = answer_text || answer_image || "";

    // Determine correctness
    const is_correct =
      std_answer && (std_answer === answer_text || std_answer === answer_image)
        ? "1"
        : "0";

    // Save answer
    await pool.promise().query(
      `INSERT INTO tbl_practice_answer
         (practice_assigned_id, question_id, student_id, std_answer, correct_answer, is_correct, subject_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        practice_assigned_id,
        question_id,
        student_id,
        std_answer || null,
        correct_answer,
        is_correct,
        subject_id,
      ],
    );

    return res.status(200).json({
      success: true,
      message: is_correct === "1" ? "Correct!" : "Incorrect",
      data: {
        is_correct,
        correct_answer,
        std_answer: std_answer || null,
      },
    });
  } catch (err) {
    // Handle duplicate (race condition)
    if (err.code === "ER_DUP_ENTRY") {
      return res
        .status(400)
        .json({ success: false, message: "Already answered this question" });
    }
    console.error("Error submitPracticeAnswer:", err.message);
    return res
      .status(500)
      .json({
        success: false,
        message: "Something went wrong",
        details: err.message,
      });
  }
}

module.exports = { submitPracticeAnswer };
