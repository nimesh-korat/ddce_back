const pool = require("../../../db/dbConnect");

async function getAllBatch(req, res) {
    try {
        const sql = `SELECT * FROM tbl_batch`;

        // Execute the query using the connection pool
        const [results] = await pool.promise().query(sql);

        if (results.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No batch found.",
            });
        }

        // Send the response with the formatted results
        return res.status(200).json({
            success: true,
            data: results,
        });

    } catch (err) {
        console.error("Error getAllBatch:", err.message);
        return res.status(500).json({
            success: false,
            message: "Error processing request",
            details: err.message,
        });
    }
}

module.exports = { getAllBatch };
