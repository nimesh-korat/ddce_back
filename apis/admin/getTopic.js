const pool = require("../../db/dbConnect");

async function getTopic(req, res) {
    const { subjectId } = req.body;
    try {
        const sql = `SELECT * FROM tbl_topic WHERE tbl_subject = ?`;
        const [results] = await pool.promise().query(sql, subjectId);


        if (results.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No chapter found for this subject.",
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

module.exports = { getTopic };
