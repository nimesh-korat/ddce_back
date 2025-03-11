const pool = require("../../../db/dbConnect");
const { format, parseISO } = require("date-fns");

async function assignTestBatch(req, res) {
    const { tbl_batch, tbl_test, start_date, end_date, isFeatured } = req.body;

    // Validate input fields
    if (!tbl_batch || !tbl_test || !start_date || !end_date || isFeatured === undefined) {
        return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    try {
        // Step 1: Check if the test is already assigned to the batch
        const checkSql = `
            SELECT * FROM tbl_test_assigned 
            WHERE tbl_batch = ? AND tbl_test = ?
        `;

        const [existingRecords] = await pool.promise().query(checkSql, [tbl_batch, tbl_test]);

        if (existingRecords.length > 0) {
            return res.status(409).json({
                success: false,
                message: "This test is already assigned to the batch."
            });
        }

        // Convert date strings to ISO format
        const isoStartDate = new Date(start_date).toISOString();
        const isoEndDate = new Date(end_date).toISOString();

        // Format dates using date-fns
        const formattedStartDate = format(parseISO(isoStartDate), "yyyy-MM-dd HH:mm:ss");
        const formattedEndDate = format(parseISO(isoEndDate), "yyyy-MM-dd HH:mm:ss");

        // Step 2: Insert the new record if no existing assignment is found
        const insertSql = `
            INSERT INTO tbl_test_assigned (tbl_batch, tbl_test, start_date, end_date, isFeatured)
            VALUES (?, ?, ?, ?, ?)
        `;

        const values = [tbl_batch, tbl_test, formattedStartDate, formattedEndDate, isFeatured];

        const [result] = await pool.promise().query(insertSql, values);

        return res.status(201).json({ success: true, message: "Test assigned successfully" });

    } catch (err) {
        console.error("Error processing assignTestBatch:", err.message);
        return res.status(500).json({ success: false, message: "Something went wrong", details: err.message });
    }
}

module.exports = { assignTestBatch };
