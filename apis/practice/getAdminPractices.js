const pool = require("../../db/dbConnect");
const { generateSignedUrl } = require("../../utils/generateSignedUrl");

async function getAdminPractices(req, res) {
  const user_id = req?.user?.id;
  const role = req?.user?.role;
  if (!user_id)
    return res.status(401).json({ success: false, message: "Unauthorized" });

  const cloudfrontDomain = process.env.AWS_CLOUDFRONT_DOMAIN;

  try {
    const whereClause =
      role === 1 ? "p.is_active = 1" : "p.is_active = 1 AND p.added_by = ?";
    const params = role === 1 ? [] : [user_id];

    const [practices] = await pool.promise().query(
      `SELECT
         p.id, p.title, p.description, p.image_url,
         p.added_by, p.added_on,
         a.Name AS added_by_name,
         COUNT(DISTINCT pq.id) AS total_questions
       FROM tbl_practice p
       LEFT JOIN admin a ON a.Id = p.added_by
       LEFT JOIN tbl_practice_questions pq ON pq.practice_id = p.id
       WHERE ${whereClause}
       GROUP BY p.id
       ORDER BY p.added_on DESC`,
      params,
    );

    const expiry = new Date(Date.now() + 1000 * 60 * 60 * 24);

    for (const prac of practices) {
      prac.image_url = prac.image_url
        ? generateSignedUrl(`${cloudfrontDomain}/${prac.image_url}`, expiry)
        : null;

      const [batches] = await pool.promise().query(
        `SELECT
           pa.id AS batch_assignment_id,
           pa.tbl_batch, pa.tbl_phase,
           pa.start_date, pa.end_date,
           pa.is_featured, pa.assigned_on,
           b.batch_title,
           ph.title AS phase_title,
           CASE
             WHEN pa.is_featured = 0 THEN 'hidden'
             WHEN pa.start_date IS NOT NULL AND pa.start_date > NOW() THEN 'upcoming'
             WHEN pa.end_date   IS NOT NULL AND pa.end_date   < NOW() THEN 'ended'
             ELSE 'active'
           END AS status
         FROM tbl_practice_assigned pa
         LEFT JOIN tbl_batch b  ON b.id  = pa.tbl_batch
         LEFT JOIN tbl_phase ph ON ph.Id = pa.tbl_phase
         WHERE pa.practice_id = ?
         ORDER BY pa.assigned_on DESC`,
        [prac.id],
      );
      prac.batch_assignments = batches;
    }

    // Attach subject / topic / subtopic arrays to each practice for client-side filtering
    if (practices.length > 0) {
      const ids = practices.map((p) => p.id);
      const placeholders = ids.map(() => "?").join(",");

      const [tagRows] = await pool.promise().query(
        `SELECT
           pq.practice_id,
           sub.Id   AS subject_id,   sub.Sub_Name      AS subject_name,
           t.Id     AS topic_id,     t.Topic_Name      AS topic_name,
           st.Id    AS subtopic_id,  st.SubTopicName   AS subtopic_name
         FROM tbl_practice_questions pq
         JOIN tbl_questions q   ON q.id  = pq.question_id
         LEFT JOIN tbl_subtopic st  ON st.Id = q.tbl_subtopic
         LEFT JOIN tbl_topic    t   ON t.Id  = st.tbl_topic
         LEFT JOIN tbl_subject  sub ON sub.Id = t.tbl_subject
         WHERE pq.practice_id IN (${placeholders})
         GROUP BY pq.practice_id, sub.Id, t.Id, st.Id`,
        ids,
      );

      // Build maps: practice_id → unique subjects/topics/subtopics
      const subjectMap = {},
        topicMap = {},
        subtopicMap = {};
      tagRows.forEach(
        ({
          practice_id,
          subject_id,
          subject_name,
          topic_id,
          topic_name,
          subtopic_id,
          subtopic_name,
        }) => {
          if (!subjectMap[practice_id]) subjectMap[practice_id] = [];
          if (!topicMap[practice_id]) topicMap[practice_id] = [];
          if (!subtopicMap[practice_id]) subtopicMap[practice_id] = [];

          if (
            subject_id &&
            !subjectMap[practice_id].some((s) => s.id === subject_id)
          )
            subjectMap[practice_id].push({
              id: subject_id,
              name: subject_name,
            });
          if (topic_id && !topicMap[practice_id].some((t) => t.id === topic_id))
            topicMap[practice_id].push({
              id: topic_id,
              name: topic_name,
              subject_id,
            });
          if (
            subtopic_id &&
            !subtopicMap[practice_id].some((s) => s.id === subtopic_id)
          )
            subtopicMap[practice_id].push({
              id: subtopic_id,
              name: subtopic_name,
              topic_id,
            });
        },
      );

      practices.forEach((p) => {
        p.subjects = subjectMap[p.id] || [];
        p.topics = topicMap[p.id] || [];
        p.subtopics = subtopicMap[p.id] || [];
      });
    }

    return res.status(200).json({ success: true, data: practices });
  } catch (err) {
    console.error("Error getAdminPractices:", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
}

module.exports = { getAdminPractices };
