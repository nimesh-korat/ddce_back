const pool = require("../../../db/dbConnect");

async function AddBatchTitle(req, res) {
    const { batch_title } = req.body;

    // Validate input fields
    if (!batch_title) {
        return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    const sql = `
        INSERT INTO tbl_batch (batch_title)
        VALUES (?)
    `;
    const values = [batch_title];

    try {
        // Execute query using pool
        const [result] = await pool.promise().query(sql, values);

        return res.status(201).json({ success: true, message: "Batch title added successfully" });
    } catch (err) {
        console.error("Error processing AddBatchTitle:", err.message);
        return res.status(500).json({ success: false, message: "Something went wrong", details: err.message });
    }
}

module.exports = { AddBatchTitle };
