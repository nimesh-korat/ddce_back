const pool = require("../../../db/dbConnect");
const { format, parseISO } = require('date-fns');

async function addTest(req, res) {
    const {
        test_name,
        test_desc,
        test_neg_marks,
        test_start_date,
        test_end_date,
        test_duration,
        test_difficulty,
    } = req.body;

    const added_by = req?.user.id;
    if (!added_by) {
        return res.status(401).json({
            success: false,
            message: "Unauthorized"
        });
    }

    console.log(req.file.filename);
    const test_img_path = req.file.filename;

    // Validate required fields
    if (!test_name || !test_img_path || !test_desc || !test_neg_marks || !test_start_date || !test_end_date || !test_duration || !test_difficulty) {
        return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    // Convert the provided date strings into ISO format (needed for parseISO)
    const isoStartDate = new Date(test_start_date).toISOString();
    const isoEndDate = new Date(test_end_date).toISOString();

    // Now parse them with date-fns
    const formattedStartDate = format(parseISO(isoStartDate), "yyyy-MM-dd HH:mm:ss");
    const formattedEndDate = format(parseISO(isoEndDate), "yyyy-MM-dd HH:mm:ss");

    console.log(formattedStartDate, formattedEndDate);

    const sql = `
        INSERT INTO tbl_test (
            test_name, 
            test_desc, 
            test_img_path, 
            test_neg_marks, 
            test_start_date, 
            test_end_date, 
            test_duration,
            test_difficulty,
            added_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const newTestDifficulty = test_difficulty === 'Easy' ? 0 : test_difficulty === 'Medium' ? 1 : test_difficulty === 'Hard' ? 2 : test_difficulty === 'Time Consuming' ? 3 : null;
    const values = [
        test_name,
        test_desc,
        test_img_path,
        test_neg_marks,
        formattedStartDate,
        formattedEndDate,
        test_duration,
        newTestDifficulty,
        added_by
    ];

    try {
        // Execute query using pool
        const [result] = await pool.promise().query(sql, values);

        return res.status(201).json({
            success: true,
            message: "Test added successfully",
            data: { id: result.insertId },
        });
    } catch (err) {
        console.error("Error processing addTest:", err.message);
        return res.status(500).json({ success: false, error: "Something went wrong", details: err.message });
    }
}

module.exports = { addTest };
