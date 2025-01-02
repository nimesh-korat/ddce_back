const pool = require("../../../db/dbConnect");
async function GetSubTopicWiseQuestionAnalytics(req, res) {
    try {
        const studentId = req?.user?.id;

        if (!studentId) {
            return res.status(400).json({
                success: false,
                message: "Student ID is required.",
            });
        }

        // SQL query to fetch performance data, including marks and accuracy by subject, topic, and subtopic
        const sql = `
            SELECT 
                s.Sub_Name AS Subject,
                t.topic_name AS Topic,
                st.SubTopicName AS Subtopic,
                SUM(sa.obt_marks) AS TotalObtainedMarks,
                SUM(q.question_marks) AS TotalPossibleMarks,
                ROUND(SUM(sa.obt_marks) / SUM(q.question_marks) * 100, 2) AS AccuracyPercentage
            FROM tbl_student_answer sa
            JOIN tbl_questions q ON sa.question_id = q.id
            JOIN tbl_subtopic st ON q.tbl_subtopic = st.Id
            JOIN tbl_topic t ON st.tbl_topic = t.Id
            JOIN tbl_subject s ON t.tbl_subject = s.Id
            WHERE sa.student_id = ?
            GROUP BY s.Sub_Name, t.topic_name, st.SubTopicName
            ORDER BY s.Sub_Name, t.topic_name, st.SubTopicName;
        `;

        // Execute the query
        const [results] = await pool.promise().query(sql, [studentId]);

        if (results.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No performance data found for this student.",
            });
        }

        // Transform the results into the desired structure
        const formattedResults = results.reduce((acc, row) => {
            const subjectIndex = acc.findIndex((s) => s.Subject === row.Subject);

            if (subjectIndex === -1) {
                acc.push({
                    Subject: row.Subject,
                    Topics: [
                        {
                            Topic: row.Topic,
                            Subtopics: [
                                {
                                    Subtopic: row.Subtopic,
                                    TotalObtainedMarks: row.TotalObtainedMarks,
                                    TotalPossibleMarks: row.TotalPossibleMarks,
                                    AccuracyPercentage: row.AccuracyPercentage,
                                },
                            ],
                        },
                    ],
                });
            } else {
                const topicIndex = acc[subjectIndex].Topics.findIndex(
                    (t) => t.Topic === row.Topic
                );
                if (topicIndex === -1) {
                    acc[subjectIndex].Topics.push({
                        Topic: row.Topic,
                        Subtopics: [
                            {
                                Subtopic: row.Subtopic,
                                TotalObtainedMarks: row.TotalObtainedMarks,
                                TotalPossibleMarks: row.TotalPossibleMarks,
                                AccuracyPercentage: row.AccuracyPercentage,
                            },
                        ],
                    });
                } else {
                    acc[subjectIndex].Topics[topicIndex].Subtopics.push({
                        Subtopic: row.Subtopic,
                        TotalObtainedMarks: row.TotalObtainedMarks,
                        TotalPossibleMarks: row.TotalPossibleMarks,
                        AccuracyPercentage: row.AccuracyPercentage,
                    });
                }
            }
            return acc;
        }, []);

        // Send the response with the formatted results
        return res.status(200).json({
            success: true,
            data: formattedResults,
        });

    } catch (err) {
        console.error("Error fetching GetSubTopicWiseQuestionAnalytics:", err.message);
        return res.status(500).json({
            success: false,
            message: "Error processing request",
            details: err.message,
        });
    }
}

module.exports = { GetSubTopicWiseQuestionAnalytics };
