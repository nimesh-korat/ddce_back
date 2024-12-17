const pool = require("../../../db/dbConnect");

async function VerifyQuestion(req, res) {
    try {
        const userId = req?.user?.id;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }

        const { question_id, correct_answer, is_correct } = req.body;

        if (!question_id) {
            return res.status(400).json({
                success: false,
                message: "Missing required fields.",
            });
        }

        const questionSql = "SELECT * FROM tbl_questions WHERE id = ? AND verifiedBy IS null";
        const [questions] = await pool.promise().query(questionSql, [question_id]);
        if (questions.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Question not found for this question id or already verified.",
            });
        }

        // Update for Correct Answer
        const updateCorrectAnswerSql = `UPDATE tbl_questions SET 
            verifiedBy = ?
            WHERE id = ?`;

        const updateCorrectAnswerValues = [
            userId,
            question_id
        ];

        // Update for Incorrect Answer
        const updateAnswerSql = `UPDATE tbl_questions SET 
            verifiedBy = ?, 
            answer_text = ?
            WHERE id = ?`;

        const updateAnswerValues = [
            userId,
            correct_answer,
            question_id
        ];

        let updateCorrectAnswerResults, updateAnswerResults;

        if (is_correct === true) {
            console.log("we are at updateCorrectAnswerResults");
            [updateCorrectAnswerResults] = await pool.promise().query(updateCorrectAnswerSql, updateCorrectAnswerValues);
        } else {
            console.log("we are at updateAnswerResults");

            [updateAnswerResults] = await pool.promise().query(updateAnswerSql, updateAnswerValues);
        }

        // Checking results
        if ((is_correct === true && updateCorrectAnswerResults.affectedRows === 0) ||
            (is_correct === false && updateAnswerResults?.affectedRows === 0)) {
            return res.status(404).json({
                success: false,
                message: "Question update failed.",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Question verification completed successfully.",
        });

    } catch (err) {
        console.error("Error processing request:", err.message);
        return res.status(500).json({
            success: false,
            message: "Error processing request",
            details: err.message,
        });
    }
}

module.exports = { VerifyQuestion };
