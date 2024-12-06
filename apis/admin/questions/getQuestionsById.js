const pool = require("../../../db/dbConnect");

async function getQuestionsById(req, res) {
    try {
        const { id } = req.body;

        const sql = `SELECT * FROM tbl_questions WHERE added_by = ?`;
        const [results] = await pool.promise().query(sql, [id]);

        if (results.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No questions found for this user.",
            });
        }

        // Send the response with the paginated results and metadata
        return res.status(200).json({
            success: true,
            data: results,
            message: "Questions retrieved successfully."
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

module.exports = { getQuestionsById };
