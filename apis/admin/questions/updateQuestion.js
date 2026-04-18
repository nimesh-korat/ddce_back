const pool = require("../../../db/dbConnect");
const { uploadFileToS3 } = require("../../../utils/uploadFileToS3");

async function updateQuestion(req, res) {
  const { id } = req.params;
  const {
    question_text,
    option_a_text,
    option_b_text,
    option_c_text,
    option_d_text,
    answer_text,
    question_marks,
    question_difficulty,
    prevAskedPaper,
    prevAskedYear,
    fromBook,
  } = req.body;

  if (!id) {
    return res
      .status(400)
      .json({ success: false, message: "Question ID is required" });
  }

  if (!question_text || !answer_text || !question_marks) {
    return res
      .status(400)
      .json({ success: false, message: "Missing required fields" });
  }

  try {
    // Fetch old question data before update (needed for result recalculation)
    const [oldQuestion] = await pool
      .promise()
      .query(
        "SELECT answer_text, answer_image, question_marks FROM tbl_questions WHERE id = ? AND is_deleted = 0",
        [id]
      );

    if (oldQuestion.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Question not found" });
    }

    const old_answer_text = oldQuestion[0].answer_text;
    const old_answer_image = oldQuestion[0].answer_image;
    const old_marks = parseFloat(oldQuestion[0].question_marks);

    // Helper to upload image to S3
    const uploadImageToS3 = async (file) => {
      if (file) {
        const fileBuffer = file.buffer;
        const fileName = `${Date.now()}-${file.originalname}`;
        const fileKey = `question_images/${fileName}`;
        const mimeType = file.mimetype;
        await uploadFileToS3(
          process.env.AWS_BUCKET_NAME,
          fileKey,
          fileBuffer,
          mimeType
        );
        return fileKey;
      }
      return null;
    };

    // Upload new images if provided
    const questionImageUrl = req.files?.["question_image"]
      ? await uploadImageToS3(req.files["question_image"][0])
      : undefined;
    const answerImageUrl = req.files?.["answer_image"]
      ? await uploadImageToS3(req.files["answer_image"][0])
      : undefined;

    // Build dynamic SET clause — only update image fields if new ones were uploaded
    const updateFields = [];
    const updateValues = [];

    updateFields.push("question_text = ?");
    updateValues.push(question_text);
    updateFields.push("option_a_text = ?");
    updateValues.push(option_a_text || null);
    updateFields.push("option_b_text = ?");
    updateValues.push(option_b_text || null);
    updateFields.push("option_c_text = ?");
    updateValues.push(option_c_text || null);
    updateFields.push("option_d_text = ?");
    updateValues.push(option_d_text || null);
    updateFields.push("answer_text = ?");
    updateValues.push(answer_text);
    updateFields.push("question_marks = ?");
    updateValues.push(question_marks);
    updateFields.push("question_difficulty = ?");
    updateValues.push(question_difficulty || null);
    updateFields.push("prevAskedPaper = ?");
    updateValues.push(prevAskedPaper || null);
    updateFields.push("prevAskedYear = ?");
    updateValues.push(prevAskedYear || null);
    updateFields.push("fromBook = ?");
    updateValues.push(fromBook || null);

    if (questionImageUrl !== undefined) {
      updateFields.push("question_image = ?");
      updateValues.push(questionImageUrl);
    }
    if (answerImageUrl !== undefined) {
      updateFields.push("answer_image = ?");
      updateValues.push(answerImageUrl);
    }

    updateValues.push(id);
    await pool
      .promise()
      .query(
        `UPDATE tbl_questions SET ${updateFields.join(", ")} WHERE id = ?`,
        updateValues
      );

    const new_marks = parseFloat(question_marks);
    const new_answer_text = answer_text;
    const answer_or_image_changed =
      old_answer_text !== new_answer_text ||
      old_marks !== new_marks ||
      answerImageUrl !== undefined;

    let students_affected = 0;

    // ── RESULT RECALCULATION ──────────────────────────────────────
    // Only recalculate if answer or marks changed
    if (answer_or_image_changed) {
      // Get all student answers for this question
      const [studentAnswers] = await pool.promise().query(
        `SELECT id, test_id, student_id, std_answer, is_correct, obt_marks
         FROM tbl_student_answer
         WHERE question_id = ?`,
        [id]
      );

      if (studentAnswers.length > 0) {
        // Get negative marks for each test (may differ per test)
        const testIds = [...new Set(studentAnswers.map((a) => a.test_id))];
        const [testsData] = await pool.promise().query(
          `SELECT id, test_neg_marks FROM tbl_test WHERE id IN (?)`,
          [testIds]
        );
        const testNegMarksMap = {};
        testsData.forEach((t) => {
          testNegMarksMap[t.id] = parseFloat(t.test_neg_marks);
        });

        // Track deltas per (student_id, test_id)
        const deltaMap = {};

        for (const sa of studentAnswers) {
          const neg_marks = testNegMarksMap[sa.test_id] || 0;
          const old_is_correct = sa.is_correct; // "0", "1", "2"
          const student_answer = sa.std_answer;

          // Recalculate new correctness
          const new_answer_final = answerImageUrl !== undefined
            ? answerImageUrl
            : new_answer_text;

          let new_is_correct;
          let new_obt_marks;

          if (old_is_correct === "2") {
            // skipped — stays skipped regardless
            new_is_correct = "2";
            new_obt_marks = 0;
          } else if (
            student_answer === new_answer_final ||
            student_answer === new_answer_text
          ) {
            new_is_correct = "1";
            new_obt_marks = new_marks;
          } else {
            new_is_correct = "0";
            new_obt_marks = -neg_marks;
          }

          const old_obt_marks = parseFloat(sa.obt_marks || 0);
          const delta = new_obt_marks - old_obt_marks;

          // Correct/incorrect count deltas
          let correct_delta = 0;
          let incorrect_delta = 0;
          if (old_is_correct === "1" && new_is_correct !== "1") correct_delta = -1;
          if (old_is_correct !== "1" && new_is_correct === "1") correct_delta = 1;
          if (old_is_correct === "0" && new_is_correct !== "0") incorrect_delta = -1;
          if (old_is_correct !== "0" && new_is_correct === "0") incorrect_delta = 1;

          // Update individual student answer row
          await pool.promise().query(
            `UPDATE tbl_student_answer
             SET is_correct = ?, obt_marks = ?, correct_answer = ?
             WHERE id = ?`,
            [new_is_correct, new_obt_marks, new_answer_text, sa.id]
          );

          // Accumulate delta for final result update
          const key = `${sa.student_id}_${sa.test_id}`;
          if (!deltaMap[key]) {
            deltaMap[key] = {
              student_id: sa.student_id,
              test_id: sa.test_id,
              score_delta: 0,
              correct_delta: 0,
              incorrect_delta: 0,
            };
          }
          deltaMap[key].score_delta += delta;
          deltaMap[key].correct_delta += correct_delta;
          deltaMap[key].incorrect_delta += incorrect_delta;
        }

        // Apply accumulated deltas to tbl_final_result
        for (const entry of Object.values(deltaMap)) {
          await pool.promise().query(
            `UPDATE tbl_final_result
             SET
               obtained_marks  = obtained_marks  + ?,
               total_correct   = GREATEST(0, total_correct   + ?),
               total_incorrect = GREATEST(0, total_incorrect + ?)
             WHERE test_id = ? AND std_id = ?`,
            [
              entry.score_delta,
              entry.correct_delta,
              entry.incorrect_delta,
              entry.test_id,
              entry.student_id,
            ]
          );
          students_affected++;
        }
      }
    }

    return res.status(200).json({
      success: true,
      message: "Question updated successfully",
      data: {
        students_affected,
        recalculated: answer_or_image_changed,
      },
    });
  } catch (err) {
    console.error("Error processing updateQuestion:", err.message);
    return res.status(500).json({
      success: false,
      message: "Something went wrong",
      details: err.message,
    });
  }
}

module.exports = { updateQuestion };
