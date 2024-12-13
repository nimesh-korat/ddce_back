const { AddParagraphQuestions } = require("../apis/admin/questions/AddParagraphQuestions");

const AddParagraphQuestionsHandler = async (req, res) => {
    try {
        // Extract data from request body and files
        const { paragraph_text, tbl_subtopic, questions } = req.body;

        // Parse questions if sent as a JSON string
        const parsedQuestions = JSON.parse(questions);

        // Map files to their respective question fields
        parsedQuestions.forEach((question, index) => {
            question.question_image = req.files["question_image"]?.[index]?.filename || null;
            question.option_a_image = req.files["option_a_image"]?.[index]?.filename || null;
            question.option_b_image = req.files["option_b_image"]?.[index]?.filename || null;
            question.option_c_image = req.files["option_c_image"]?.[index]?.filename || null;
            question.option_d_image = req.files["option_d_image"]?.[index]?.filename || null;
            question.answer_image = req.files["answer_image"]?.[index]?.filename || null;
        });

        // Construct the request payload
        const requestBody = {
            paragraph_text,
            paragraph_img: req.files["paragraph_img"]?.[0]?.filename || null,
            tbl_subtopic,
            questions: parsedQuestions,
        };

        // Call your service or database function
        const result = await AddParagraphQuestions(requestBody);

        // Respond with success
        res.status(200).json({ success: true, data: result });
    } catch (err) {
        console.error("Error processing request:", err);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

module.exports = { AddParagraphQuestionsHandler };
