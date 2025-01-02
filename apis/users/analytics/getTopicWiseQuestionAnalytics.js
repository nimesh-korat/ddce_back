const pool = require("../../../db/dbConnect");

async function GetTopicWiseQuestionAnalytics(req, res) {

    try {
        const studentId = req?.user?.id;

        if (!studentId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized request",
            });
        }

        // SQL query to fetch performance data (topic-wise) using obtained marks and question marks
        const sql = `
            SELECT 
                s.Sub_Name AS Subject,
                t.topic_name AS Topic,
                COUNT(sa.id) AS TotalQuestions,
                SUM(sa.obt_marks) AS TotalObtainedMarks,
                SUM(q.question_marks) AS TotalPossibleMarks,
                ROUND(SUM(sa.obt_marks) / SUM(q.question_marks) * 100, 2) AS AccuracyPercentage
            FROM tbl_student_answer sa
            JOIN tbl_questions q ON sa.question_id = q.id
            JOIN tbl_subtopic st ON q.tbl_subtopic = st.Id
            JOIN tbl_topic t ON st.tbl_topic = t.Id
            JOIN tbl_subject s ON t.tbl_subject = s.Id
            WHERE sa.student_id = ?
            GROUP BY s.Sub_Name, t.topic_name
            ORDER BY s.Sub_Name, t.topic_name;
        `;

        // Execute the query
        const [results] = await pool.promise().query(sql, [studentId]);

        if (results.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No performance data found for this student",
            });
        }

        // Transform the results into the desired structure
        const response = { subjects: [] };

        results.forEach(result => {
            // Check if the subject already exists in the response array
            let subject = response.subjects.find(sub => sub[result.Subject]);

            // If subject doesn't exist, create a new entry
            if (!subject) {
                subject = { [result.Subject]: [] };
                response.subjects.push(subject);
            }

            // Add the topic data to the subject
            subject[result.Subject].push({
                topicName: result.Topic,
                totalQuestions: result.TotalQuestions,
                totalObtainedMarks: result.TotalObtainedMarks,
                totalPossibleMarks: result.TotalPossibleMarks,
                accuracyPercentage: result.AccuracyPercentage
            });
        });

        // Send the response
        return res.status(200).json({
            success: true,
            data: response,
        });
    } catch (err) {
        console.error("Error fetching GetTopicWiseQuestionAnalytics:", err.message);
        return res.status(500).json({
            success: false,
            message: "Error processing request",
            details: err.message,
        });
    }
}

module.exports = { GetTopicWiseQuestionAnalytics };
