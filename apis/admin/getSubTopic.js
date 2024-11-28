const pool = require("../../db/dbConnect");

async function getSubTopic(req, res) {
    const { topicId } = req.body;
    try {
        const sql = `SELECT * FROM tbl_subtopic WHERE tbl_topic = ?`;
        const [results] = await pool.promise().query(sql, topicId);


        if (results.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No sub topics found for this chapter.",
            });
        }

        // Send the response with the formatted results
        return res.status(200).json({
            success: true,
            data: results,
        });

    } catch (err) {
        console.error("Error fetching subjects:", err.message);
        return res.status(500).json({
            success: false,
            message: "Error processing request",
            details: err.message,
        });
    }
}

module.exports = { getSubTopic };
