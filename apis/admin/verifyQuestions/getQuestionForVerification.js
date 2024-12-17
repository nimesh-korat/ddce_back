const pool = require("../../../db/dbConnect");

async function getQuestionsForVerification(req, res) {
    const { subtopic_id } = req.body;
    const user = req?.user.id;
    if (!user) {
        return res.status(401).json({
            success: false,
            message: "Unauthorized"
        });
    }
    try {
        // Fetch all questions
        const questionsQuery = `
            SELECT 
                id AS question_id,
                question_text,
                question_image,
                option_a_text,
                option_a_image,
                option_b_text,
                option_b_image,
                option_c_text,
                option_c_image,
                option_d_text,
                option_d_image,
                question_difficulty,
                answer_text,
                answer_image,
                question_marks
            FROM tbl_questions WHERE verifiedBy IS null AND tbl_subtopic = ?
        `;
        const [questions] = await pool.promise().query(questionsQuery, [subtopic_id]);

        // If no questions exist, return a message
        if (questions.length === 0) {
            return res.status(200).json({
                success: false,
                message: "No questions found",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Questions fetched successfully",
            data: questions,
        });
    } catch (err) {
        console.error("Error processing getQuestionsForVerification:", err.message);
        return res.status(500).json({
            success: false,
            error: "Database error",
            details: err.message,
        });
    }
}

module.exports = { getQuestionsForVerification };
