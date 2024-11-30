const pool = require("../../../db/dbConnect");

async function getQuestions(req, res) {
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
            SELECT question_text, option_a_text, option_b_text, option_c_text, option_d_text, answer_text
            FROM tbl_questions
            LIMIT ? OFFSET ?
        `;
        const [results] = await pool.promise().query(sql, [limit, offset]);

        // Calculate pagination metadata
        const totalPages = Math.ceil(totalQuestions / limit);
        const hasMore = page < totalPages;
        const nextPage = hasMore ? page + 1 : null;

        // Send the response with the paginated results and metadata
        return res.status(200).json({
            success: true,
            data: results,
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
