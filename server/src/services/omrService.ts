export interface OMREvaluationRequest {
  examId?: string;
  studentRollNumber?: string;
  studentName?: string;
  setCode: 'P' | 'Q' | 'R' | 'S';
  studentAnswers: Record<number, string>; // { 1: 'A', 2: 'C', ... }
  masterAnswerKey: Record<number, string>; // { 1: 'A', 2: 'B', ... }
  marksPerQuestion: number;
  negativeMarks: number;
}

export interface QuestionEvaluationResult {
  qNumber: number;
  studentAnswer: string | null;
  correctAnswer: string;
  status: 'CORRECT' | 'WRONG' | 'UNATTEMPTED';
  marksAwarded: number;
}

export interface OMREvaluationResult {
  studentRollNumber: string;
  studentName: string;
  setCode: 'P' | 'Q' | 'R' | 'S';
  totalQuestions: number;
  attempted: number;
  correctCount: number;
  wrongCount: number;
  unattemptedCount: number;
  positiveMarks: number;
  negativeMarks: number;
  netScore: number;
  maxScore: number;
  percentage: number;
  questionDetails: QuestionEvaluationResult[];
}

/**
 * Evaluate OMR Responses against a specified Set Answer Key
 */
export function evaluateOMRSubmission(req: OMREvaluationRequest): OMREvaluationResult {
  const {
    studentRollNumber = 'N/A',
    studentName = 'Anonymous Student',
    setCode = 'P',
    studentAnswers = {},
    masterAnswerKey = {},
    marksPerQuestion = 1,
    negativeMarks = 0
  } = req;

  const totalQuestions = Object.keys(masterAnswerKey).length;
  let correctCount = 0;
  let wrongCount = 0;
  let unattemptedCount = 0;
  const questionDetails: QuestionEvaluationResult[] = [];

  for (let q = 1; q <= totalQuestions; q++) {
    const correct = (masterAnswerKey[q] || '').toUpperCase().trim();
    const rawStudent = studentAnswers[q];
    const studentAns = rawStudent ? rawStudent.toUpperCase().trim() : null;

    if (!studentAns || studentAns === '') {
      unattemptedCount++;
      questionDetails.push({
        qNumber: q,
        studentAnswer: null,
        correctAnswer: correct,
        status: 'UNATTEMPTED',
        marksAwarded: 0
      });
    } else if (studentAns === correct) {
      correctCount++;
      questionDetails.push({
        qNumber: q,
        studentAnswer: studentAns,
        correctAnswer: correct,
        status: 'CORRECT',
        marksAwarded: marksPerQuestion
      });
    } else {
      wrongCount++;
      questionDetails.push({
        qNumber: q,
        studentAnswer: studentAns,
        correctAnswer: correct,
        status: 'WRONG',
        marksAwarded: -negativeMarks
      });
    }
  }

  const positiveMarks = correctCount * marksPerQuestion;
  const negativeMarksDeducted = wrongCount * negativeMarks;
  const netScore = Math.max(0, positiveMarks - negativeMarksDeducted);
  const maxScore = totalQuestions * marksPerQuestion;
  const percentage = maxScore > 0 ? parseFloat(((netScore / maxScore) * 100).toFixed(2)) : 0;

  return {
    studentRollNumber,
    studentName,
    setCode,
    totalQuestions,
    attempted: correctCount + wrongCount,
    correctCount,
    wrongCount,
    unattemptedCount,
    positiveMarks,
    negativeMarks: negativeMarksDeducted,
    netScore,
    maxScore,
    percentage,
    questionDetails
  };
}
