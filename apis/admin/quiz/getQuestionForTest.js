const pool = require("../../../db/dbConnect");

async function getQuestionsForTest(req, res) {
    const { subtopic_id } = req.body;
    try {
        // Fetch all questions
        const questionsQuery = `
            SELECT 
                q.id AS question_id,
                q.question_text,
                q.question_image,
                q.option_a_text,
                q.option_a_image,
                q.option_b_text,
                q.option_b_image,
                q.option_c_text,
                q.option_c_image,
                q.option_d_text,
                q.option_d_image,
                q.question_difficulty,
                q.answer_text,
                q.answer_image,
                q.question_marks
            FROM tbl_questions q WHERE tbl_subtopic = ?
        `;
        const [questions] = await pool.promise().query(questionsQuery, [subtopic_id]);

        // If no questions exist, return a message
        if (questions.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No questions found",
            });
        }

        // Fetch all questions already added to any test
        const askedQuestionsQuery = `
            SELECT DISTINCT question_id
            FROM tbl_test_questions
        `;
        const [askedQuestions] = await pool.promise().query(askedQuestionsQuery);

        // Convert the asked question IDs into a set for faster lookup
        const askedQuestionIds = new Set(
            askedQuestions.map((row) => row.question_id)
        );

        // Add `isAsked` field to each question
        const questionsWithIsAsked = questions.map((question) => ({
            ...question,
            isAsked: askedQuestionIds.has(question.question_id),
        }));

        return res.status(200).json({
            success: true,
            message: "Questions fetched successfully",
            data: questionsWithIsAsked,
        });
    } catch (err) {
        console.error("Error processing getQuestionsForTest:", err.message);
        return res.status(500).json({
            success: false,
            error: "Database error",
            details: err.message,
        });
    }
}

module.exports = { getQuestionsForTest };
