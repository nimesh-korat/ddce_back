const pool = require("../../../db/dbConnect");

async function GetParagraph(req, res) {
    try {
        const { subtopic_id } = req.body;
        const added_by = req?.user?.id;

        if (!added_by) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }

        if (!subtopic_id) {
            return res.status(400).json({
                success: false,
                message: "Missing required fields!",
            });
        }

        const sql = `SELECT * FROM tbl_paragraph WHERE status = "0" AND added_by = ? AND tbl_subtopic = ?`;
        const values = [added_by, subtopic_id];

        const [results] = await pool.promise().query(sql, values);

        if (results.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No paragraph found for this user.",
            });
        }

        // Send the response with the paginated results and metadata
        return res.status(200).json({
            success: true,
            data: results,
            message: "Paragraph retrieved successfully."
        });

    } catch (err) {
        console.error("Error fetching paragraph:", err.message);
        return res.status(500).json({
            success: false,
            message: "Error processing request",
            details: err.message,
        });
    }
}

module.exports = { GetParagraph };