const pool = require("../../db/dbConnect");

async function GetSyllabusWithPaper(req, res) {
    try {
        // SQL query to fetch the paper data and associated subjects and topics
        const sql = `
            SELECT 
                tt.Id AS PaperId,
                tt.PaperName,  -- Fetch paper name from tbl_test_type
                tt.Paper,  -- Fetch paper identifier or description
                tt.NoOfQuestions,  -- Fetch number of questions from tbl_test_type
                tt.MaxMarks,  -- Fetch maximum marks from tbl_test_type
                s.Id AS SubjectId, 
                s.Sub_Name AS Subject,  -- Subject name
                s.Weightage AS SubjectWeightage,  -- Subject weightage
                t.Id AS TopicId,
                t.topic_name AS Topic,  -- Topic name
                t.weightage AS TopicWeightage,  -- Topic weightage
                st.Id AS SubtopicId,
                st.SubTopicName AS Subtopic,  -- Subtopic name
                COUNT(q.Id) AS TotalQuestions  -- Count of questions in subtopic
            FROM tbl_test_type tt
            LEFT JOIN tbl_subject s ON tt.Id = s.tbl_test_type  -- Join tbl_test_type with tbl_subject
            LEFT JOIN tbl_topic t ON s.Id = t.tbl_subject  -- Join tbl_subject with tbl_topic
            LEFT JOIN tbl_subtopic st ON t.Id = st.tbl_topic  -- Join tbl_topic with tbl_subtopic
            LEFT JOIN tbl_questions q ON st.Id = q.tbl_subtopic  -- Join tbl_subtopic with tbl_questions
            GROUP BY tt.Id, tt.PaperName, tt.Paper, tt.NoOfQuestions, tt.MaxMarks, s.Id, s.Sub_Name, s.Weightage, t.Id, t.topic_name, t.weightage, st.Id, st.SubTopicName;
        `;

        // Execute the query
        const [results] = await pool.promise().query(sql);

        if (results.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No data found.",
            });
        }

        // Transform the results into the desired structure
        const formattedResults = results.reduce((acc, row) => {
            // Format subject and topic weightage
            const subjectWeightage = row.SubjectWeightage % 1 === 0 ? parseInt(row.SubjectWeightage) : row.SubjectWeightage;
            const topicWeightage = row.TopicWeightage % 1 === 0 ? parseInt(row.TopicWeightage) : row.TopicWeightage;

            // Find the paper in the accumulator
            const paperIndex = acc.findIndex((p) => p.PaperId === row.PaperId);

            if (paperIndex === -1) {
                // If paper is not found, create a new entry
                acc.push({
                    PaperId: row.PaperId,
                    PaperName: row.PaperName,
                    Paper: row.Paper,
                    NoOfQuestions: row.NoOfQuestions,
                    MaxMarks: row.MaxMarks,
                    Subjects: [
                        {
                            SubjectId: row.SubjectId,
                            Subject: row.Subject,
                            SubjectWeightage: subjectWeightage,
                            Topics: [
                                {
                                    TopicId: row.TopicId,
                                    Topic: row.Topic,
                                    TopicWeightage: topicWeightage,
                                    Subtopics: [
                                        {
                                            SubtopicId: row.SubtopicId,
                                            Subtopic: row.Subtopic,
                                            TotalQuestions: row.TotalQuestions
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                });
            } else {
                // If paper is found, check for the subject
                const subjectIndex = acc[paperIndex].Subjects.findIndex((s) => s.SubjectId === row.SubjectId);
                if (subjectIndex === -1) {
                    // If subject is not found, add a new subject under the paper
                    acc[paperIndex].Subjects.push({
                        SubjectId: row.SubjectId,
                        Subject: row.Subject,
                        SubjectWeightage: subjectWeightage,
                        Topics: [
                            {
                                TopicId: row.TopicId,
                                Topic: row.Topic,
                                TopicWeightage: topicWeightage,
                                Subtopics: [
                                    {
                                        SubtopicId: row.SubtopicId,
                                        Subtopic: row.Subtopic,
                                        TotalQuestions: row.TotalQuestions
                                    }
                                ]
                            }
                        ]
                    });
                } else {
                    // If subject is found, check for the topic
                    const topicIndex = acc[paperIndex].Subjects[subjectIndex].Topics.findIndex((t) => t.TopicId === row.TopicId);
                    if (topicIndex === -1) {
                        // If topic is not found, add a new topic under the subject
                        acc[paperIndex].Subjects[subjectIndex].Topics.push({
                            TopicId: row.TopicId,
                            Topic: row.Topic,
                            TopicWeightage: topicWeightage,
                            Subtopics: [
                                {
                                    SubtopicId: row.SubtopicId,
                                    Subtopic: row.Subtopic,
                                    TotalQuestions: row.TotalQuestions
                                }
                            ]
                        });
                    } else {
                        // If topic is found, add the subtopic to it
                        acc[paperIndex].Subjects[subjectIndex].Topics[topicIndex].Subtopics.push({
                            SubtopicId: row.SubtopicId,
                            Subtopic: row.Subtopic,
                            TotalQuestions: row.TotalQuestions
                        });
                    }
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
        console.error("Error fetching paper data with subjects:", err.message);
        return res.status(500).json({
            success: false,
            message: "Error processing request",
            details: err.message,
        });
    }
}

module.exports = { GetSyllabusWithPaper };
