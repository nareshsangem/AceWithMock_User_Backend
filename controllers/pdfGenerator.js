const PDFDocument = require('pdfkit');
const pool = require('../db');

const pdfGenerator = async (req, res) => {
  const { attemptId } = req.params;

  try {
    // 1. Get test_id from test_attempts
    const { rows: attemptRows } = await pool.query(
      'SELECT test_id FROM test_attempts WHERE id = $1',
      [attemptId]
    );
    if (attemptRows.length === 0) {
      return res.status(404).send('Test attempt not found.');
    }
    const testId = attemptRows[0].test_id;

    // 2. Get all questions for the test
    const { rows: allQuestions } = await pool.query(
      'SELECT id, question, options, correct_answers FROM questions WHERE test_id = $1 ORDER BY id',
      [testId]
    );

    // 3. Get all attempted answers for this attempt (wrong only)
    const { rows: wrongAnswers } = await pool.query(
      `SELECT a.question_id, q.question, q.options, q.correct_answers, a.answers AS selected, a.is_correct
       FROM test_attempt_answers a
       JOIN questions q ON q.id = a.question_id
       WHERE a.attempt_id = $1 AND a.is_correct = false`,
      [attemptId]
    );

    // 4. Get all attempted question_ids for this attempt
    const { rows: attemptedRows } = await pool.query(
      'SELECT question_id FROM test_attempt_answers WHERE attempt_id = $1',
      [attemptId]
    );
    const attemptedIds = attemptedRows.map(row => row.question_id);

    // 5. Find unattempted questions (those not in attemptedIds)
    const unattempted = allQuestions
      .filter(q => !attemptedIds.includes(q.id))
      .map(q => ({
        question: q.question,
        options: q.options,
        correct_answers: q.correct_answers,
        selected: null,
        is_correct: null,
        is_unattempted: true,
      }));

    // 6. Combine both sets
    const combined = [...wrongAnswers.map(q => ({ ...q, is_unattempted: false })), ...unattempted];

    if (combined.length === 0) {
      return res.status(404).send('No wrong or unattempted questions found.');
    }

    // 7. Generate PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="wrong_and_unattempted_report.pdf"');

    const doc = new PDFDocument({ margin: 40 });
    doc.pipe(res);

    doc.fontSize(18).text('Wrong & Unattempted Answers Report', { align: 'center' }).moveDown();

    combined.forEach((q, idx) => {
      doc.fontSize(12).fillColor('black').text(`Q${idx + 1}: ${q.question}`);

      if (q.options && Array.isArray(q.options)) {
        doc.fontSize(11).fillColor('gray').text(`Options: ${q.options.join(', ')}`);
      }

      const isUnattempted = q.is_unattempted;
      const userAnswer = isUnattempted ? 'Not Answered' : (q.selected || []).join(', ');
      const correctAnswer = Array.isArray(q.correct_answers) ? q.correct_answers.join(', ') : 'N/A';

      doc
        .fontSize(11)
        .fillColor(isUnattempted ? 'orange' : 'red')
        .text(`Your Answer: ${userAnswer}`);
      doc.fontSize(11).fillColor('green').text(`Correct Answer: ${correctAnswer}`);
      doc.moveDown();
    });

    doc.end();
  } catch (error) {
    console.error('❌ Error generating PDF:', error);
    res.status(500).send('Failed to generate PDF report.');
  }
};

module.exports = { pdfGenerator };
