const pool = require("../../db/dbConnect");

async function GetSyllabus(req, res) {
  const exam_type_id = req?.user?.exam_type_id || null;

  try {
    // Check what columns/tables exist
    let hasGroupCol = false,
      hasWeightageTable = false,
      hasExamTypeCol = false;
    try {
      await pool.promise().query("SELECT group_id FROM tbl_topic LIMIT 1");
      hasGroupCol = true;
    } catch (e) {}
    try {
      await pool.promise().query("SELECT 1 FROM tbl_topic_weightage LIMIT 1");
      hasWeightageTable = true;
    } catch (e) {}
    try {
      await pool
        .promise()
        .query("SELECT exam_type_id FROM tbl_test_type LIMIT 1");
      hasExamTypeCol = true;
    } catch (e) {}

    console.log(
      "[Syllabus] exam_type_id:",
      exam_type_id,
      "| hasGroupCol:",
      hasGroupCol,
      "| hasExamTypeCol:",
      hasExamTypeCol,
      "| hasWeightageTable:",
      hasWeightageTable,
    );

    const examFilter =
      exam_type_id && hasExamTypeCol
        ? `AND tt.exam_type_id = ${pool.escape(exam_type_id)}`
        : "";

    const groupJoin = hasGroupCol
      ? "LEFT JOIN tbl_topic_group g ON g.id = t.group_id"
      : "";
    const groupCols = hasGroupCol
      ? "g.id AS GroupId, g.name AS GroupName,"
      : "NULL AS GroupId, NULL AS GroupName,";
    const groupBy = hasGroupCol ? ", g.id, g.name" : "";

    const sql = `
      SELECT
        s.Id AS SubjectId, s.Sub_Name AS Subject, s.Weightage AS SubjectWeightage,
        ${groupCols}
        t.Id AS TopicId, t.topic_name AS Topic, MAX(t.weightage) AS TopicWeightage,
        st.SubTopicName AS Subtopic, COUNT(q.Id) AS TotalQuestions
      FROM tbl_subject s
      JOIN tbl_test_type tt ON tt.Id = s.tbl_test_type
      LEFT JOIN tbl_topic t ON t.tbl_subject = s.Id
      ${groupJoin}
      LEFT JOIN tbl_subtopic st ON st.tbl_topic = t.Id
      LEFT JOIN tbl_questions q ON q.tbl_subtopic = st.Id
        AND (q.is_deleted IS NULL OR q.is_deleted = 0)
      WHERE 1=1 ${examFilter}
      GROUP BY s.Id, s.Sub_Name, s.Weightage ${groupBy}, t.Id, t.topic_name, st.SubTopicName
      ORDER BY s.Sub_Name, t.topic_name, st.SubTopicName
    `;

    console.log("[Syllabus] examFilter:", examFilter || "(none)");

    const [results] = await pool.promise().query(sql);

    console.log("[Syllabus] rows returned:", results.length, "| subjects:", [
      ...new Set(results.map((r) => r.Subject)),
    ]);

    if (results.length === 0)
      return res.status(200).json({ success: true, data: [], exam_type_id });

    // Year weightage for JEE
    let weightageMap = {};
    if (exam_type_id && hasWeightageTable) {
      const topicIds = [
        ...new Set(results.map((r) => r.TopicId).filter(Boolean)),
      ];
      if (topicIds.length > 0) {
        const [wRows] = await pool
          .promise()
          .query(
            `SELECT topic_id, year, weightage FROM tbl_topic_weightage WHERE topic_id IN (${topicIds.map(() => "?").join(",")}) ORDER BY year ASC`,
            topicIds,
          );
        wRows.forEach((w) => {
          if (!weightageMap[w.topic_id]) weightageMap[w.topic_id] = [];
          weightageMap[w.topic_id].push({
            year: w.year,
            weightage: parseFloat(w.weightage) || 0,
          });
        });
      }
    }

    const subjectMap = {};
    results.forEach((row) => {
      if (!subjectMap[row.SubjectId]) {
        subjectMap[row.SubjectId] = {
          SubjectId: row.SubjectId,
          Subject: row.Subject,
          SubjectWeightage: row.SubjectWeightage,
          Groups: {},
          Topics: {},
        };
      }
      const subj = subjectMap[row.SubjectId];
      const addTopic = (container) => {
        if (!container[row.TopicId]) {
          container[row.TopicId] = {
            TopicId: row.TopicId,
            Topic: row.Topic,
            TopicWeightage: row.TopicWeightage,
            YearWeightage: weightageMap[row.TopicId] || [],
            Subtopics: [],
          };
        }
        if (
          row.Subtopic &&
          !container[row.TopicId].Subtopics.find(
            (s) => s.Subtopic === row.Subtopic,
          )
        ) {
          container[row.TopicId].Subtopics.push({
            Subtopic: row.Subtopic,
            TotalQuestions: row.TotalQuestions,
          });
        }
      };
      if (row.GroupId) {
        if (!subj.Groups[row.GroupId])
          subj.Groups[row.GroupId] = {
            GroupId: row.GroupId,
            GroupName: row.GroupName,
            Topics: {},
          };
        addTopic(subj.Groups[row.GroupId].Topics);
      } else {
        addTopic(subj.Topics);
      }
    });

    const data = Object.values(subjectMap).map((s) => ({
      ...s,
      Groups: Object.values(s.Groups).map((g) => ({
        ...g,
        Topics: Object.values(g.Topics),
      })),
      Topics: Object.values(s.Topics),
    }));

    return res.status(200).json({ success: true, data, exam_type_id });
  } catch (err) {
    console.error("[Syllabus] ERROR:", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
}
module.exports = { GetSyllabus };
