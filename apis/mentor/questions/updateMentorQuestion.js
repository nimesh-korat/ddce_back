const pool = require("../../../db/dbConnect");
const { uploadFileToS3 } = require("../../../utils/uploadFileToS3");

async function updateMentorQuestion(req, res) {
  const { id } = req.params;
  const mentor_id = req?.user?.id;
  const {
    question_text, option_a_text, option_b_text,
    option_c_text, option_d_text, answer_text,
    question_marks, question_difficulty, prevAskedPaper, prevAskedYear, fromBook,
  } = req.body;

  if (!id) return res.status(400).json({ success: false, message: "Question ID required" });
  if (!question_text || !answer_text || !question_marks)
    return res.status(400).json({ success: false, message: "Missing required fields" });

  try {
    // Ownership check
    const [existing] = await pool.promise().query(
      "SELECT answer_text, question_marks, added_by FROM tbl_questions WHERE id = ? AND is_deleted = 0",
      [id]
    );
    if (existing.length === 0)
      return res.status(404).json({ success: false, message: "Question not found" });
    if (existing[0].added_by !== mentor_id)
      return res.status(403).json({ success: false, message: "You can only edit your own questions" });

    const old_answer_text = existing[0].answer_text;
    const old_marks = parseFloat(existing[0].question_marks);
    const new_marks = parseFloat(question_marks);

    const uploadImageToS3 = async (file) => {
      if (!file) return null;
      const fileKey = `question_images/${Date.now()}-${file.originalname}`;
      await uploadFileToS3(process.env.AWS_BUCKET_NAME, fileKey, file.buffer, file.mimetype);
      return fileKey;
    };

    const questionImageUrl = req.files?.["question_image"]
      ? await uploadImageToS3(req.files["question_image"][0]) : undefined;
    const answerImageUrl = req.files?.["answer_image"]
      ? await uploadImageToS3(req.files["answer_image"][0]) : undefined;

    const updateFields = [
      "question_text = ?", "option_a_text = ?", "option_b_text = ?",
      "option_c_text = ?", "option_d_text = ?", "answer_text = ?",
      "question_marks = ?", "question_difficulty = ?",
      "prevAskedPaper = ?", "prevAskedYear = ?", "fromBook = ?",
    ];
    const updateValues = [
      question_text, option_a_text || null, option_b_text || null,
      option_c_text || null, option_d_text || null, answer_text,
      question_marks, question_difficulty || null,
      prevAskedPaper || null, prevAskedYear || null, fromBook || null,
    ];
    if (questionImageUrl !== undefined) { updateFields.push("question_image = ?"); updateValues.push(questionImageUrl); }
    if (answerImageUrl !== undefined) { updateFields.push("answer_image = ?"); updateValues.push(answerImageUrl); }
    updateValues.push(id);

    await pool.promise().query(
      `UPDATE tbl_questions SET ${updateFields.join(", ")} WHERE id = ?`,
      updateValues
    );

    // Cascade result recalculation if answer or marks changed
    const answer_or_marks_changed = old_answer_text !== answer_text || old_marks !== new_marks || answerImageUrl !== undefined;
    let students_affected = 0;

    if (answer_or_marks_changed) {
      const [studentAnswers] = await pool.promise().query(
        `SELECT id, test_id, student_id, std_answer, is_correct, obt_marks FROM tbl_student_answer WHERE question_id = ?`,
        [id]
      );
      if (studentAnswers.length > 0) {
        const testIds = [...new Set(studentAnswers.map((a) => a.test_id))];
        const [testsData] = await pool.promise().query(
          `SELECT id, test_neg_marks FROM tbl_test WHERE id IN (?)`, [testIds]
        );
        const testNegMarksMap = {};
        testsData.forEach((t) => { testNegMarksMap[t.id] = parseFloat(t.test_neg_marks); });

        const deltaMap = {};
        for (const sa of studentAnswers) {
          const neg_marks = testNegMarksMap[sa.test_id] || 0;
          const new_is_correct = sa.std_answer === answer_text ? "1" : "0";
          const new_obt_marks = new_is_correct === "1" ? new_marks : -neg_marks;
          const old_obt_marks = parseFloat(sa.obt_marks || 0);
          const delta = new_obt_marks - old_obt_marks;

          let correct_delta = 0, incorrect_delta = 0;
          if (sa.is_correct === "1" && new_is_correct !== "1") correct_delta = -1;
          if (sa.is_correct !== "1" && new_is_correct === "1") correct_delta = 1;
          if (sa.is_correct === "0" && new_is_correct !== "0") incorrect_delta = -1;
          if (sa.is_correct !== "0" && new_is_correct === "0") incorrect_delta = 1;

          await pool.promise().query(
            `UPDATE tbl_student_answer SET is_correct = ?, obt_marks = ?, correct_answer = ? WHERE id = ?`,
            [new_is_correct, new_obt_marks, answer_text, sa.id]
          );

          const key = `${sa.student_id}_${sa.test_id}`;
          if (!deltaMap[key]) deltaMap[key] = { student_id: sa.student_id, test_id: sa.test_id, score_delta: 0, correct_delta: 0, incorrect_delta: 0 };
          deltaMap[key].score_delta += delta;
          deltaMap[key].correct_delta += correct_delta;
          deltaMap[key].incorrect_delta += incorrect_delta;
        }

        for (const entry of Object.values(deltaMap)) {
          await pool.promise().query(
            `UPDATE tbl_final_result SET obtained_marks = obtained_marks + ?, total_correct = GREATEST(0, total_correct + ?), total_incorrect = GREATEST(0, total_incorrect + ?) WHERE test_id = ? AND std_id = ?`,
            [entry.score_delta, entry.correct_delta, entry.incorrect_delta, entry.test_id, entry.student_id]
          );
          students_affected++;
        }
      }
    }

    return res.status(200).json({
      success: true,
      message: "Question updated successfully",
      data: { students_affected, recalculated: answer_or_marks_changed },
    });
  } catch (err) {
    console.error("Error updateMentorQuestion:", err.message);
    return res.status(500).json({ success: false, message: "Something went wrong", details: err.message });
  }
}

module.exports = { updateMentorQuestion };
