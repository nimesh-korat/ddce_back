const pool = require("../../../db/dbConnect");

async function addFinalResult(req, res) {
    const { test_id } = req.body;

    // Validate required fields
    if (!test_id) {
        return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    const std_id = req?.user.id;
    if (!std_id) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    try {
        // Check if the result already exists
        const checkQuery = `
            SELECT id 
            FROM tbl_final_result 
            WHERE test_id = ? AND std_id = ?
        `;
        const [existingResult] = await pool.promise().query(checkQuery, [test_id, std_id]);

        if (existingResult.length > 0) {
            return res.status(400).json({
                success: false,
                message: "Result already exists for this student and test",
            });
        }

        // Fetch total marks and question data for the test
        const totalMarksQuery = `
            SELECT SUM(q.question_marks) AS total_marks
            FROM tbl_questions q
            JOIN tbl_test_questions tq ON q.id = tq.question_id
            WHERE tq.test_id = ?
        `;
        const [totalMarksResult] = await pool.promise().query(totalMarksQuery, [test_id]);
        console.log(totalMarksResult);

        if (totalMarksResult.length === 0 || totalMarksResult[0].total_marks === null) {
            return res.status(404).json({ success: false, message: "No questions found for this test" });
        }

        const total_marks = totalMarksResult[0].total_marks;

        // Fetch student answers for the test
        const studentAnswersQuery = `
            SELECT 
                is_correct,
                obt_marks
            FROM tbl_student_answer
            WHERE test_id = ? AND student_id = ?
        `;
        const [studentAnswers] = await pool.promise().query(studentAnswersQuery, [test_id, std_id]);

        if (studentAnswers.length === 0) {
            return res.status(404).json({ success: false, message: "No answers found for this student" });
        }

        // Calculate result details
        let total_correct = 0;
        let total_incorrect = 0;
        let total_skipped = 0;
        let obtained_marks = 0;

        studentAnswers.forEach(answer => {
            if (answer.is_correct === "1") { // 1 for "correct"
                total_correct++;
                obtained_marks += parseFloat(answer.obt_marks || 0);
            } else if (answer.is_correct === "0") { // 0 for "incorrect"
                total_incorrect++;
                obtained_marks += parseFloat(answer.obt_marks || 0); // This might be negative for incorrect
            } else if (answer.is_correct === "2") {  // 2 for "skipped"
                total_skipped++;
            }
        });

        // Determine pass/fail status
        // const status = obtained_marks >= total_marks * 0.5 ? "passed" : "failed"; // Example: Pass if >= 50% of total marks

        // Insert final result into the database
        const insertQuery = `
            INSERT INTO tbl_final_result (
                test_id, 
                std_id, 
                total_marks, 
                obtained_marks, 
                total_correct, 
                total_incorrect, 
                total_skipped, 
                status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const insertValues = [
            test_id,
            std_id,
            total_marks,
            obtained_marks,
            total_correct,
            total_incorrect,
            total_skipped,
            "1", // Assuming "1" for "active"
        ];

        const [insertResult] = await pool.promise().query(insertQuery, insertValues);

        return res.status(201).json({
            success: true,
            message: "Final result recorded successfully",
            data: {
                id: insertResult.insertId,
                test_id,
                std_id,
                total_marks,
                obtained_marks,
                total_correct,
                total_incorrect,
                total_skipped,
                status,
            },
        });
    } catch (err) {
        console.error("Error processing addFinalResult:", err.message);
        return res.status(500).json({ success: false, error: "Database error", details: err.message });
    }
}

module.exports = { addFinalResult };
