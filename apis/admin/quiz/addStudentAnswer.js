const pool = require("../../../db/dbConnect");

async function addStudentAnswer(req, res) {
    const { test_id, answers } = req.body;

    // Validate required fields
    if (!test_id || !answers || !Array.isArray(answers)) {
        return res.status(400).json({ success: false, message: "Missing required fields or invalid data format" });
    }

    const student_id = req?.user.id;
    if (!student_id) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    try {
        const results = [];

        for (const answer of answers) {
            const { question_id, std_answer, attempt_status: rawAttemptStatus } = answer;

            if (!question_id || !rawAttemptStatus) {
                results.push({ success: false, message: "Missing question_id or attempt_status", question_id });
                continue;
            }

            // Check if the student's answer for this question and test already exists
            const checkQuery = `
                SELECT id 
                FROM tbl_student_answer 
                WHERE test_id = ? AND question_id = ? AND student_id = ?
            `;
            const [existingAnswer] = await pool.promise().query(checkQuery, [test_id, question_id, student_id]);

            if (existingAnswer.length > 0) {
                results.push({
                    success: false,
                    message: "Answer for this question already exists for the student in this test",
                    question_id,
                });
                continue;
            }

            // Fetch the correct answer (answer_text and answer_image) and marks for the question
            const questionQuery = `
                SELECT answer_text, answer_image, question_marks 
                FROM tbl_questions 
                WHERE id = ?
            `;
            const [questionResult] = await pool.promise().query(questionQuery, [question_id]);

            if (questionResult.length === 0) {
                results.push({ success: false, message: "Question not found", question_id });
                continue;
            }

            const { answer_text, answer_image, question_marks } = questionResult[0];

            // Fetch negative marks for the test
            const testQuery = `
                SELECT test_neg_marks 
                FROM tbl_test 
                WHERE id = ?
            `;
            const [testResult] = await pool.promise().query(testQuery, [test_id]);

            if (testResult.length === 0) {
                results.push({ success: false, message: "Test not found", question_id });
                continue;
            }

            const { test_neg_marks } = testResult[0];

            // Set the attempt status to 1 (even if the user has skipped the question)
            const attempt_status = "1"; // Always set attempt_status to "1"

            // Determine correctness and obtained marks based on the answer
            let is_correct;
            let obt_marks;

            if (rawAttemptStatus === "skipped") {
                is_correct = "2"; // 2 for skipped
                obt_marks = 0;
            } else if (std_answer === answer_text || std_answer === answer_image) {
                is_correct = "1"; // 1 for correct
                obt_marks = question_marks;
            } else {
                is_correct = "0"; // 0 for incorrect
                obt_marks = -test_neg_marks;
            }

            console.log("Attempt Status:", rawAttemptStatus);

            // Insert the student's answer into the database
            const sql = `
                INSERT INTO tbl_student_answer (
                    test_id, 
                    question_id, 
                    student_id, 
                    std_answer, 
                    correct_answer, 
                    is_correct, 
                    obt_marks, 
                    attempt_status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `;

            const correct_answer = answer_text || answer_image || null; // Handle missing fields gracefully
            const values = [
                test_id,
                question_id,
                student_id,
                std_answer || null,
                correct_answer,
                is_correct,
                obt_marks,
                attempt_status // Always set attempt_status to "1"
            ];

            const [insertResult] = await pool.promise().query(sql, values);

            results.push({
                success: true,
                message: "Answer recorded successfully",
                question_id,
                data: {
                    id: insertResult.insertId,
                    test_id,
                    question_id,
                    student_id,
                    std_answer,
                    correct_answer,
                    is_correct,
                    obt_marks,
                    attempt_status,
                },
            });
        }

        // After all answers are processed, calculate and add the final result
        await addFinalResult(test_id, student_id);

        return res.status(201).json({
            success: true,
            message: "Answers processed successfully",
            results,
        });
    } catch (err) {
        console.error("Error processing addStudentAnswer:", err.message);
        return res.status(500).json({ success: false, error: "Database error", details: err.message });
    }
}

async function addFinalResult(test_id, std_id) {

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
            console.log("Result already exists for this student and test");
            return;
        }

        // Fetch total marks and question data for the test
        const totalMarksQuery = `
            SELECT SUM(q.question_marks) AS total_marks
            FROM tbl_questions q
            JOIN tbl_test_questions tq ON q.id = tq.question_id
            WHERE tq.test_id = ?
        `;
        const [totalMarksResult] = await pool.promise().query(totalMarksQuery, [test_id]);

        if (totalMarksResult.length === 0 || totalMarksResult[0].total_marks === null) {
            console.log("No questions found for this test");
            return;
        }

        const total_marks = totalMarksResult[0].total_marks;

        // Fetch student answers for the test
        const studentAnswersQuery = `
            SELECT is_correct, obt_marks
            FROM tbl_student_answer
            WHERE test_id = ? AND student_id = ?
        `;
        const [studentAnswers] = await pool.promise().query(studentAnswersQuery, [test_id, std_id]);

        if (studentAnswers.length === 0) {
            console.log("No answers found for this student");
            return;
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

        console.log("Final result recorded successfully:", insertResult);
    } catch (err) {
        console.error("Error processing addFinalResult:", err.message);
    }
}

module.exports = { addStudentAnswer };
