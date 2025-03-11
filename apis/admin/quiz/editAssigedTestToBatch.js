const pool = require("../../../db/dbConnect");
const { format, parseISO } = require("date-fns");

async function editTestBatch(req, res) {
    const { id, tbl_batch, tbl_test, start_date, end_date, isFeatured } = req.body;

    // Validate input fields
    if (!id || !tbl_batch || !tbl_test || !start_date || !end_date || isFeatured === undefined) {
        return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    // Convert and format dates using date-fns
    const formattedStartDate = format(parseISO(start_date), "yyyy-MM-dd HH:mm:ss");
    const formattedEndDate = format(parseISO(end_date), "yyyy-MM-dd HH:mm:ss");

    const sql = `
        UPDATE tbl_test_assigned 
        SET tbl_batch = ?, tbl_test = ?, start_date = ?, end_date = ?, isFeatured = ?
        WHERE id = ?
    `;

    const values = [tbl_batch, tbl_test, formattedStartDate, formattedEndDate, isFeatured, id];

    try {
        // Execute the update query
        const [result] = await pool.promise().query(sql, values);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: "Test batch not found" });
        }

        return res.status(200).json({ success: true, message: "Test batch updated successfully" });
    } catch (err) {
        console.error("Error processing editTestBatch:", err.message);
        return res.status(500).json({ success: false, message: "Something went wrong", details: err.message });
    }
}

module.exports = { editTestBatch };
