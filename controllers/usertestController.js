const pool = require('../db')

// Middleware to verify if the user owns the test attempt
const verifyAttemptOwnership = async (attemptId, userId) => {
  const result = await pool.query(
    `SELECT 1 FROM test_attempts WHERE id = $1 AND user_id = $2`,
    [attemptId, userId]
  );
  return result.rowCount > 0;
};
// req.body: { test_id }
const startTest = async (req, res) => {
  try {
    const { test_id } = req.body;
    const user_id = req.user.id;

    

    // Insert a new test attempt with current timestamp
    const result = await pool.query(
      `
      INSERT INTO test_attempts (user_id, test_id, started_at, status)
      VALUES ($1, $2, NOW(), 'in_progress')
      RETURNING *;
      `,
      [user_id, test_id]
    );

    
    res.json({ resumed: false, attempt: result.rows[0] });
  } catch (error) {
    console.error('🔥 Error in startTest:', error);
    res.status(500).json({ error: 'Server error while starting test' });
  }
};


// req.body: { question_id, answers: [], marked_for_review }
const saveAnswer = async (req, res) => {
  const { attemptId } = req.params;
  const { question_id, answers, marked_for_review } = req.body;

 

  try {
    if (!attemptId || !question_id || !Array.isArray(answers)) {
      console.error("❌ Invalid input");
      return res.status(400).json({ error: "Invalid input data" });
    }

    // Clean answers: remove blanks and trim
    const cleanedAnswers = answers.filter(
      (ans) => typeof ans === "string" && ans.trim() !== ""
    );

    const isEmpty = cleanedAnswers.length === 0;

    if (isEmpty) {
      await pool.query(
        `DELETE FROM test_attempt_answers WHERE attempt_id = $1 AND question_id = $2`,
        [attemptId, question_id]
      );
      
      return res.sendStatus(200);
    }

    const answersJson = JSON.stringify(cleanedAnswers);

    const updateRes = await pool.query(
      `UPDATE test_attempt_answers
       SET answers = $1::jsonb, marked_for_review = $2, updated_at = NOW()
       WHERE attempt_id = $3 AND question_id = $4
       RETURNING *`,
      [answersJson, marked_for_review, attemptId, question_id]
    );

    if (updateRes.rowCount === 0) {
      await pool.query(
        `INSERT INTO test_attempt_answers (attempt_id, question_id, answers, marked_for_review)
         VALUES ($1, $2, $3::jsonb, $4)`,
        [attemptId, question_id, answersJson, marked_for_review]
      );
    }

    
    res.sendStatus(200);
  } catch (err) {
    console.error("🔥 Error saving answer:", err);
    res.status(500).json({ error: "Failed to save answer" });
  }
};

const clearAnswer = async (req, res) => {
  const { attempt_id, question_id } = req.body;

  try {
    await pool.query(
      'DELETE FROM test_attempt_answers WHERE attempt_id = $1 AND question_id = $2',
      [attempt_id, question_id]
    );
    return res.status(200).json({ message: 'Answer cleared' });
  } catch (error) {
    console.error('Error clearing answer:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

const submitTest = async (req, res) => {
  const { attemptId } = req.params;
  
  
  try {
    // 1. Fetch all saved answers for the attempt
    const answersRes = await pool.query(
      'SELECT * FROM test_attempt_answers WHERE attempt_id = $1',
      [attemptId]
    );
    const answers = answersRes.rows;
    
    // 2. Fetch the test attempt to verify existence
    const testRes = await pool.query(
      'SELECT * FROM test_attempts WHERE id = $1',
      [attemptId]
    );
    const test = testRes.rows[0];
    if (!test) {
      return res.status(404).json({ message: 'Test attempt not found' });
    }
    
    let totalScore = 0;
    const subjectScores = {};

    for (const ans of answers) {
      const questionRes = await pool.query(
        'SELECT * FROM questions WHERE id = $1',
        [ans.question_id]
      );
      const question = questionRes.rows[0];
      if (!question) continue;

      const userAns = Array.isArray(ans.answers) ? ans.answers.sort() : [];
      const correctAns = Array.isArray(question.correct_answers) ? question.correct_answers.sort() : [];

      const isCorrect = JSON.stringify(userAns) === JSON.stringify(correctAns);
      const marks = question.positive_marks || 1;
      const negative = question.negative_marks || 0;

      // Update is_correct in test_attempt_answers
      await pool.query(
        'UPDATE test_attempt_answers SET is_correct = $1 WHERE id = $2',
        [isCorrect, ans.id]
      );
      // Score calculation
      if (isCorrect) {
        totalScore += marks;
        const subj = question.subject || 'General';
        subjectScores[subj] = (subjectScores[subj] || 0) + marks;
      } else {
        totalScore -= negative;
      }
    }
  
    // 3. Update test_attempts table
    await pool.query(
      `UPDATE test_attempts 
       SET status = 'submitted', submitted_at = NOW(), total_score = $1, subject_scores = $2 
       WHERE id = $3`,
      [totalScore, JSON.stringify(subjectScores), attemptId]
    );

    res.json({ totalScore, subjectScores });
    
  } catch (error) {
    console.error('🔥 Error in submitTest:', error);
    res.status(500).json({ error: 'Server error during test submission' });
    
  }
};


const getTestById = async (req, res) => {
  try {
    const id = req.params.id;
    const result = await pool.query(`SELECT * FROM tests WHERE id=$1`, [id]);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};


const getTestAttempt = async (req, res) => {
  const { attemptId } = req.params;
  try {
    const attemptResult = await pool.query(
      `SELECT ta.id AS attempt_id, ta.user_id, ta.test_id, ta.status, ta.started_at, 
              ta.submitted_at, ta.total_score, ta.subject_scores,
              t.name, t.duration_minutes, t.subjects
       FROM test_attempts ta
       JOIN tests t ON ta.test_id = t.id
       WHERE ta.id = $1`,
      [attemptId]
    );

    if (attemptResult.rows.length === 0) {
      return res.status(404).json({ message: 'Attempt not found' });
    }

    const test = attemptResult.rows[0];

    const questionsResult = await pool.query(
      `SELECT id, question,image, options, type, positive_marks, negative_marks
       FROM questions
       WHERE test_id = $1
       ORDER BY id ASC`,
      [test.test_id]
    );

    res.json({
      test: {
        id: test.test_id,
        name: test.name,
        duration_minutes: test.duration_minutes,
        subjects: Array.isArray(test.subjects)
          ? test.subjects
          : JSON.parse(test.subjects || '[]'),
      },
      questions: questionsResult.rows,
    });
  
  } catch (err) {
    console.error('Error fetching test attempt:', err);
    res.status(500).json({ message: 'Failed to fetch test attempt' });
  }
};



const getTestResult = async (req, res) => {
  const { attemptId } = req.params;
  

  try {
    // 1. Fetch attempt + test info
    const attemptQuery = `
      SELECT 
        ta.*, 
        t.name AS test_name, 
        t.total_questions, 
        t.duration_minutes,
        t.id AS test_id
      FROM test_attempts ta
      JOIN tests t ON t.id = ta.test_id
      WHERE ta.id = $1
    `;
    const { rows: [attempt] } = await pool.query(attemptQuery, [attemptId]);
    if (!attempt) return res.status(404).json({ error: 'Attempt not found' });

    // 2. Fetch all questions of the test
    const allQuestionsQuery = `
      SELECT 
        q.id AS question_id,
        q.question AS question_text,
        q.type,
        q.image,
        q.options,
        q.correct_answers,
        q.subject,
        q.positive_marks,
        q.negative_marks
      FROM questions q
      WHERE q.test_id = $1
    `;
    const { rows: allQuestions } = await pool.query(allQuestionsQuery, [attempt.test_id]);

    // 3. Fetch all attempted answers
    const answersQuery = `
      SELECT 
        taa.question_id,
        taa.answers AS selected,
        taa.is_correct,
        taa.marked_for_review
      FROM test_attempt_answers taa
      WHERE taa.attempt_id = $1
    `;
    const { rows: attemptedAnswers } = await pool.query(answersQuery, [attemptId]);

    // 4. Map answers by question_id for lookup
    const answerMap = {};
    attemptedAnswers.forEach(ans => {
      answerMap[ans.question_id] = ans;
    });

    // 5. Initialize variables
    let totalMarks = 0;
    const subjectScores = {};
    const formattedAnswers = [];

    // 6. Loop through all questions to build answers + subjectStats
    for (const q of allQuestions) {
      const ans = answerMap[q.question_id];
      const subject = q.subject || 'General';
      const posMarks = q.positive_marks || 1;
      const isAttempted = !!ans;
      const isAnswered = isAttempted && Array.isArray(ans.selected) && ans.selected.length > 0;
      const isCorrect = ans?.is_correct || false;

      // total marks for full test
      totalMarks += posMarks;

      // init subjectStats
      if (!subjectScores[subject]) {
        subjectScores[subject] = {
          scored: 0,
          total: 0,
          questionStats: {
            correct: 0,
            wrong: 0,
            unattempted: 0
          }
        };
      }

      subjectScores[subject].total += posMarks;

      // update subject stats
      if (!isAnswered) {
        subjectScores[subject].questionStats.unattempted += 1;
      } else if (isCorrect) {
        subjectScores[subject].scored += posMarks;
        subjectScores[subject].questionStats.correct += 1;
      } else {
        subjectScores[subject].questionStats.wrong += 1;
      }

      // formatted answers (for frontend + PDF)
      formattedAnswers.push({
        questionId: q.question_id,
        questionText: q.question_text,
        type: q.type,
        image: q.image,
        options: q.options,
        correctAnswers: q.correct_answers,
        selected: ans?.selected || [],
        is_correct: isCorrect,
        markedForReview: ans?.marked_for_review || false,
        answered: isAnswered,
        subject: subject
      });
    }

    // 7. Time taken
    const submittedAt = attempt.submitted_at ? new Date(attempt.submitted_at) : new Date();
    const startedAt = new Date(attempt.started_at);
    const diffMs = submittedAt - startedAt;
    const minutes = Math.floor(diffMs / 60000);
    const seconds = Math.floor((diffMs % 60000) / 1000);
    const timeTaken = { minutes, seconds };

    // 8. Final response
    const result = {
      test: {
        name: attempt.test_name,
        totalQuestions: attempt.total_questions,
        durationMinutes: attempt.duration_minutes
      },
      totalScore: attempt.total_score,
      totalMarks,
      subjectScores,
      timeTaken,
      answers: formattedAnswers
    };

    return res.json(result);

  } catch (err) {
    console.error("❌ Error in getTestResult:", err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};




const activeAttempt= async (req, res) => {
  const { testId } = req.params;
  const userId = req.user.id;

  const result = await pool.query(
    `SELECT ta.id, ta.started_at, t.duration_minutes
     FROM test_attempts ta
     JOIN tests t ON ta.test_id = t.id
     WHERE ta.user_id = $1 AND ta.test_id = $2 AND ta.status = 'in_progress'
     LIMIT 1`,
    [userId, testId]
  );

  if (result.rows.length > 0) {
    const { id, started_at, duration_minutes } = result.rows[0];
    const now = new Date();
    const startTime = new Date(started_at);
    const elapsedMinutes = (now - startTime) / (1000 * 60);

    if (elapsedMinutes > duration_minutes + 5) {
      // auto-expire it
      await pool.query(
        `UPDATE test_attempts SET status = 'expired', submitted_at = NOW() WHERE id = $1`,
        [id]
      );
      return res.json({ attemptId: null });
    }

    return res.json({ attemptId: id });
  } else {
    return res.json({ attemptId: null });
  }
};

// 定义一个异步函数myTests，用于获取用户的测试尝试
const myAttempts = async (req, res) => {
  const userId = req.user.id;

  try {
    const attempts = await pool.query(
      `SELECT 
         a.id, 
         a.status, 
         a.total_score, 
         a.started_at, 
         a.submitted_at,
         t.name AS test_name, 
         t.total_marks
       FROM test_attempts a
       JOIN tests t ON a.test_id = t.id
       WHERE a.user_id = $1
       ORDER BY a.started_at DESC`,
      [userId]
    );

    res.status(200).json({ success: true, attempts: attempts.rows });
  } catch (err) {
    console.error('Error fetching attempts:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch attempts' });
  }
};




module.exports = {
  startTest,
  saveAnswer,
  clearAnswer,
  submitTest,
  getTestById,
  getTestAttempt,
  getTestResult,
  activeAttempt,
  myAttempts,
};