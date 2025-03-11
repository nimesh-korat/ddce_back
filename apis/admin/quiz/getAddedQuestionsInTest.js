const { generateSignedUrl } = require("../../../utils/generateSignedUrl");
const pool = require("../../../db/dbConnect");

async function getAddedQuestionsInTest(req, res) {
    const cloudfrontDomain = process.env.AWS_CLOUDFRONT_DOMAIN;
    const { test_id } = req.body; // Assuming test_id is sent in the request body

    // Validate required fields
    if (!test_id) {
        return res.status(400).json({ success: false, message: "Missing required test_id" });
    }

    try {
        // Fetch questions for the given test
        const sql = `
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
                q.question_marks,
                q.question_difficulty,
                q.answer_text,
                q.answer_image,
                tq.test_id
            FROM tbl_questions q
            JOIN tbl_test_questions tq ON q.id = tq.question_id
            WHERE tq.test_id = ?
        `;

        const [questions] = await pool.promise().query(sql, [test_id]);

        if (questions.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No questions found for the given test",
            });
        }

        // Generate signed URLs for images
        const signedQuestions = questions.map((question) => {
            // Helper function to generate signed URL or return null if no image path
            const generateSignedImageUrl = (imagePath) => {
                return imagePath
                    ? generateSignedUrl(
                        `${cloudfrontDomain}/${imagePath}`,
                        new Date(Date.now() + 1000 * 60 * 60 * 24) // 1 day expiry
                    )
                    : null;
            };

            return {
                ...question,
                question_image: generateSignedImageUrl(question.question_image),
                option_a_image: generateSignedImageUrl(question.option_a_image),
                option_b_image: generateSignedImageUrl(question.option_b_image),
                option_c_image: generateSignedImageUrl(question.option_c_image),
                option_d_image: generateSignedImageUrl(question.option_d_image),
            };
        });

        return res.status(200).json({
            success: true,
            message: "Questions fetched successfully",
            data: signedQuestions,
        });
    } catch (err) {
        console.error("Error fetching questions for test:", err.message);
        return res.status(500).json({
            success: false,
            error: "Database error",
            details: err.message,
        });
    }
}

module.exports = { getAddedQuestionsInTest };
