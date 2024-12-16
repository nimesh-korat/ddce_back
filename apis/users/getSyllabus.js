const pool = require("../../db/dbConnect");

async function GetSyllabus(req, res) {
    try {
        // SQL query to fetch the required data, including the weightage from tbl_subject and tbl_topic
        const sql = `
            SELECT 
                s.Sub_Name AS Subject,
                s.Weightage AS SubjectWeightage,  -- Fetch weightage from tbl_subject
                t.topic_name AS Topic,
                t.weightage AS TopicWeightage,  -- Fetch weightage from tbl_topic
                st.SubTopicName AS Subtopic,
                COUNT(q.Id) AS TotalQuestions
            FROM tbl_subject s
            LEFT JOIN tbl_topic t ON s.Id = t.tbl_subject
            LEFT JOIN tbl_subtopic st ON t.Id = st.tbl_topic
            LEFT JOIN tbl_questions q ON st.Id = q.tbl_subtopic
            GROUP BY s.Sub_Name, s.weightage, t.topic_name, t.weightage, st.SubTopicName;
        `;

        // Execute the query
        const [results] = await pool.promise().query(sql);

        if (results.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No data found.",
            });
        }

        // Transform the results into the desired structure with weightages
        const formattedResults = results.reduce((acc, row) => {
            // Use parseInt to remove decimal part if weightage is a whole number
            const subjectWeightage = row.SubjectWeightage % 1 === 0 ? parseInt(row.SubjectWeightage) : row.SubjectWeightage;
            const topicWeightage = row.TopicWeightage % 1 === 0 ? parseInt(row.TopicWeightage) : row.TopicWeightage;

            const subjectIndex = acc.findIndex((s) => s.Subject === row.Subject);

            if (subjectIndex === -1) {
                acc.push({
                    Subject: row.Subject,
                    SubjectWeightage: subjectWeightage,  // Add formatted subject weightage
                    Topics: [
                        {
                            Topic: row.Topic,
                            TopicWeightage: topicWeightage,  // Add formatted topic weightage
                            Subtopics: [
                                {
                                    Subtopic: row.Subtopic,
                                    TotalQuestions: row.TotalQuestions,
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
                        TopicWeightage: topicWeightage,  // Add formatted topic weightage
                        Subtopics: [
                            {
                                Subtopic: row.Subtopic,
                                TotalQuestions: row.TotalQuestions,
                            },
                        ],
                    });
                } else {
                    acc[subjectIndex].Topics[topicIndex].Subtopics.push({
                        Subtopic: row.Subtopic,
                        TotalQuestions: row.TotalQuestions,
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
        console.error("Error fetching subjects:", err.message);
        return res.status(500).json({
            success: false,
            message: "Error processing request",
            details: err.message,
        });
    }
}

module.exports = { GetSyllabus };
