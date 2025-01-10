const { generateSignedUrl } = require("../../../utils/generateSignedUrl");
const pool = require("../../../db/dbConnect");

async function getQuestions(req, res) {
    const cloudfrontDomain = process.env.AWS_CLOUDFRONT_DOMAIN;
    try {
        // Extract page and limit from query parameters, with defaults
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 10;

        // Calculate OFFSET
        const offset = (page - 1) * limit;

        // Query to get the total count of questions
        const countSql = `SELECT COUNT(*) AS total FROM tbl_questions`;
        const [countResult] = await pool.promise().query(countSql);
        const totalQuestions = countResult[0].total;

        if (totalQuestions === 0) {
            return res.status(404).json({
                success: false,
                message: "No questions found.",
            });
        }

        // Query to fetch paginated questions
        const sql = `
            WITH ranked_questions AS (
                SELECT 
                    question_text,
                    question_image,
                    option_a_text, 
                    option_b_text, 
                    option_c_text, 
                    option_d_text,
                    option_a_image,
                    option_b_image,
                    option_c_image,
                    option_d_image,
                    answer_text, 
                    tbl_subtopic,
                    ROW_NUMBER() OVER (PARTITION BY tbl_subtopic ORDER BY id) AS subtopic_rank
                FROM tbl_questions
            )
            SELECT *
            FROM ranked_questions
            ORDER BY subtopic_rank, tbl_subtopic
            LIMIT ? OFFSET ?;
        `;
        const [results] = await pool.promise().query(sql, [limit, offset]);

        // Generate signed URLs for images
        const signedQuestions = await Promise.all(
            results.map(async (question) => {
                // Generate signed URLs for images if they exist
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
            })
        );

        // Calculate pagination metadata
        const totalPages = Math.ceil(totalQuestions / limit);
        const hasMore = page < totalPages;
        const nextPage = hasMore ? page + 1 : null;

        // Send the response with the paginated results and metadata
        return res.status(200).json({
            success: true,
            data: signedQuestions,
            currentPage: page,
            totalPages,
            hasMore,
            nextPage,
        });

    } catch (err) {
        console.error("Error fetching questions:", err.message);
        return res.status(500).json({
            success: false,
            message: "Error processing request",
            details: err.message,
        });
    }
}

module.exports = { getQuestions };
