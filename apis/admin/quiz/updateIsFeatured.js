const pool = require("../../../db/dbConnect");

async function updateIsFeatured(req, res) {
    try {
        const { id, isFeatured } = req.body;

        // Validate input
        if (!id || isFeatured === undefined) {
            return res.status(400).json({ success: false, message: "Missing required fields" });
        }

        const sql = `UPDATE tbl_test_assigned SET isFeatured = ? WHERE id = ?`;

        // Execute query
        const [result] = await pool.promise().query(sql, [isFeatured, id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: "No record found" });
        }

        return res.status(200).json({ success: true, message: "Feature status updated successfully" });
    } catch (err) {
        console.error("Error updating isFeatured:", err.message);
        return res.status(500).json({ success: false, message: "Something went wrong", details: err.message });
    }
}

module.exports = { updateIsFeatured };
