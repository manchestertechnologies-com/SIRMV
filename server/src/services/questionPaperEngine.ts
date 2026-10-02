import { queryQuestionPool, getQuestionPool, getAllPoolHealth } from '../database/questionPools';

export interface RawQuestion {
  id: string;
  subject: string;
  klass: string;
  chapter: string;
  topic?: string;
  exams?: string[];
  q_type: string;
  question: string;
  opt_a?: string;
  opt_b?: string;
  opt_c?: string;
  opt_d?: string;
  assertion?: string;
  reason?: string;
  predef_options?: string;
  column_a?: string;
  column_b?: string;
  match_options?: string;
  num_answer?: string;
  correct_option: string;
  solution_text?: string;
  source?: string;
  year?: string;
}

export interface ProcessedQuestion {
  id: string;
  originalId: string;
  qNumber: number;
  subject: string;
  klass: string;
  chapter: string;
  topic?: string;
  qType: string;
  question: string;
  optA?: string;
  optB?: string;
  optC?: string;
  optD?: string;
  correctOption: string;
  solutionText?: string;
  marks: number;
  negativeMarks: number;
  assertion?: string;
  reason?: string;
  columnA?: string;
  columnB?: string;
  matchOptions?: string;
  numAnswer?: string;
}

export interface ExamPaperSet {
  setCode: 'P' | 'Q' | 'R' | 'S';
  title: string;
  institutionName: string;
  academicYear: string;
  examDate?: string;
  durationMinutes: number;
  totalMarks: number;
  totalQuestions: number;
  instructions: string[];
  sections: Array<{
    name: string;
    subject: string;
    instructions?: string;
    questions: ProcessedQuestion[];
  }>;
  answerKey: Record<number, string>;
  solutions: Array<{
    qNumber: number;
    subject: string;
    chapter: string;
    correctOption: string;
    solutionText: string;
  }>;
}

export interface MasterAnswerKeyRow {
  baseNumber: number;
  subject: string;
  chapter: string;
  setKeys: {
    P: { qNumber: number; correct: string };
    Q: { qNumber: number; correct: string };
    R: { qNumber: number; correct: string };
    S: { qNumber: number; correct: string };
  };
}

export interface GeneratedExamSuite {
  examId: string;
  title: string;
  pattern: string;
  institutionName: string;
  academicYear: string;
  durationMinutes: number;
  totalMarks: number;
  totalQuestions: number;
  instructions: string[];
  createdAt: string;
  sets: {
    P: ExamPaperSet;
    Q: ExamPaperSet;
    R: ExamPaperSet;
    S: ExamPaperSet;
  };
  masterAnswerKeyMatrix: MasterAnswerKeyRow[];
}

export interface BlueprintSubjectConfig {
  subject: string;
  klass: '11' | '12';
  chapters: string[];
  questionCount: number;
  marksPerQuestion: number;
  negativeMarks: number;
  qTypes?: string[];
  examTags?: string[];
}

export interface BlueprintRequest {
  title: string;
  institutionName?: string;
  academicYear?: string;
  pattern: 'KCET' | 'NEET' | 'JEE_MAIN' | 'PU_BOARD_MIDTERM' | 'PU_BOARD_ANNUAL' | 'CUSTOM';
  durationMinutes: number;
  instructions?: string[];
  subjects: BlueprintSubjectConfig[];
  shuffleOptions?: boolean;
  selectedQuestionIds?: Record<string, string[]>; // subject_class -> array of ids
}

/**
 * Fetch available chapters and counts for a given subject & class
 */
export async function getSubjectMeta(subject: string, klass: string | number) {
  const sql = `
    SELECT 
      chapter, 
      count(*) as total_questions,
      count(*) FILTER (WHERE q_type = 'mcq' OR q_type = 'MCQ' OR q_type IS NULL) as mcq_count,
      count(*) FILTER (WHERE q_type ILIKE '%numeric%' OR q_type ILIKE '%integer%') as numeric_count,
      count(*) FILTER (WHERE q_type ILIKE '%match%') as match_count,
      count(*) FILTER (WHERE q_type ILIKE '%assertion%') as assertion_count,
      ARRAY_AGG(DISTINCT topic) FILTER (WHERE topic IS NOT NULL AND topic <> '') as topics
    FROM questions
    WHERE chapter IS NOT NULL AND chapter <> ''
    GROUP BY chapter
    ORDER BY chapter ASC
  `;

  const { rows, poolKey } = await queryQuestionPool(subject, klass, sql);
  return {
    poolKey,
    subject,
    klass,
    chapters: rows.map(r => ({
      chapter: r.chapter,
      totalQuestions: parseInt(r.total_questions, 10),
      mcqCount: parseInt(r.mcq_count || '0', 10),
      numericCount: parseInt(r.numeric_count || '0', 10),
      matchCount: parseInt(r.match_count || '0', 10),
      assertionCount: parseInt(r.assertion_count || '0', 10),
      topics: (r.topics || []).slice(0, 15)
    }))
  };
}

/**
 * Search questions across a specific subject database
 */
export async function searchQuestions(
  subject: string,
  klass: string | number,
  options: {
    chapter?: string;
    topic?: string;
    qType?: string;
    keyword?: string;
    examTag?: string;
    limit?: number;
    offset?: number;
  }
) {
  const params: any[] = [];
  let paramIdx = 1;
  const conditions: string[] = ['1=1'];

  if (options.chapter) {
    conditions.push(`chapter = $${paramIdx++}`);
    params.push(options.chapter);
  }

  if (options.topic) {
    conditions.push(`topic ILIKE $${paramIdx++}`);
    params.push(`%${options.topic}%`);
  }

  if (options.qType) {
    conditions.push(`q_type ILIKE $${paramIdx++}`);
    params.push(`%${options.qType}%`);
  }

  if (options.keyword) {
    conditions.push(`(question ILIKE $${paramIdx++} OR chapter ILIKE $${paramIdx++})`);
    params.push(`%${options.keyword}%`);
    params.push(`%${options.keyword}%`);
  }

  if (options.examTag) {
    conditions.push(`$${paramIdx++} = ANY(exams)`);
    params.push(options.examTag);
  }

  const limit = options.limit || 50;
  const offset = options.offset || 0;

  const countSql = `SELECT count(*) as total FROM questions WHERE ${conditions.join(' AND ')}`;
  const countRes = await queryQuestionPool(subject, klass, countSql, params);
  const total = parseInt(countRes.rows[0]?.total || '0', 10);

  const querySql = `
    SELECT * 
    FROM questions 
    WHERE ${conditions.join(' AND ')}
    ORDER BY created_at DESC NULLS LAST, id ASC
    LIMIT ${limit} OFFSET ${offset}
  `;

  const { rows, poolKey } = await queryQuestionPool<RawQuestion>(subject, klass, querySql, params);

  return {
    total,
    limit,
    offset,
    poolKey,
    questions: rows
  };
}

/**
 * Helper: Shuffle an array using Fisher-Yates with deterministic seed or math random
 */
function shuffleArray<T>(array: T[], seedOffset = 0): T[] {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    // Generate pseudo-random index
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Helper: Permute questions for Sets Q, R, S while preserving section structure
 */
function permuteQuestionsForSet(questions: RawQuestion[], setCode: 'P' | 'Q' | 'R' | 'S'): RawQuestion[] {
  if (setCode === 'P') return [...questions];

  const len = questions.length;
  if (len <= 1) return [...questions];

  // Distinct shuffling strategies per set
  if (setCode === 'Q') {
    // Interleaved split (e.g. odds first, then evens reversed)
    const odds = questions.filter((_, i) => i % 2 === 1);
    const evens = questions.filter((_, i) => i % 2 === 0);
    return [...odds, ...evens.reverse()];
  } else if (setCode === 'R') {
    // Reverse chunks of 3 or 4
    const result: RawQuestion[] = [];
    const chunkSize = 4;
    for (let i = 0; i < len; i += chunkSize) {
      const chunk = questions.slice(i, i + chunkSize);
      result.push(...chunk.reverse());
    }
    return result.reverse();
  } else {
    // Set S: Block swap (mid split swap + sub-reverse)
    const mid = Math.floor(len / 2);
    const firstHalf = questions.slice(0, mid);
    const secondHalf = questions.slice(mid);
    return [...secondHalf, ...firstHalf];
  }
}

/**
 * Helper: Shuffle MCQ Options (A, B, C, D) and remap correct option
 */
function shuffleQuestionOptions(q: RawQuestion): {
  optA: string;
  optB: string;
  optC: string;
  optD: string;
  correctOption: string;
} {
  const origOpts: { key: string; text: string }[] = [
    { key: 'A', text: q.opt_a || '' },
    { key: 'B', text: q.opt_b || '' },
    { key: 'C', text: q.opt_c || '' },
    { key: 'D', text: q.opt_d || '' }
  ].filter(o => o.text.trim().length > 0);

  if (origOpts.length < 4) {
    return {
      optA: q.opt_a || '',
      optB: q.opt_b || '',
      optC: q.opt_c || '',
      optD: q.opt_d || '',
      correctOption: (q.correct_option || 'A').toUpperCase().trim()
    };
  }

  const origCorrect = (q.correct_option || 'A').toUpperCase().trim();
  const correctItem = origOpts.find(o => o.key === origCorrect) || origOpts[0];

  // Shuffle options
  const shuffled = shuffleArray(origOpts);
  const newKeys = ['A', 'B', 'C', 'D'];
  let newCorrect = 'A';

  const finalOpts: Record<string, string> = { optA: '', optB: '', optC: '', optD: '' };

  shuffled.forEach((item, idx) => {
    const assignedKey = newKeys[idx];
    if (item === correctItem) {
      newCorrect = assignedKey;
    }
    if (idx === 0) finalOpts.optA = item.text;
    if (idx === 1) finalOpts.optB = item.text;
    if (idx === 2) finalOpts.optC = item.text;
    if (idx === 3) finalOpts.optD = item.text;
  });

  return {
    optA: finalOpts.optA,
    optB: finalOpts.optB,
    optC: finalOpts.optC,
    optD: finalOpts.optD,
    correctOption: newCorrect
  };
}

/**
 * Generate Complete 4-Set Examination Suite (P, Q, R, S)
 */
export async function generateExamSuite(blueprint: BlueprintRequest): Promise<GeneratedExamSuite> {
  const institutionName = blueprint.institutionName || 'SIR MV PU COLLEGE - SHIVAMOGGA CAMPUS';
  const academicYear = blueprint.academicYear || '2026-2027';
  const examId = `EXAM-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

  // Default Instructions
  const defaultInstructions = [
    'Write your Roll Number clearly in the box provided and darken the corresponding bubbles on the OMR sheet.',
    `Each correct answer carries marks specified in the section header. Negative marking will be applied as configured (${blueprint.subjects[0]?.negativeMarks || 0} marks deducted per wrong response).`,
    'Darken only ONE bubble per question on the OMR Answer Sheet using Blue / Black Ball Point Pen.',
    'No rough work is permitted on the OMR Answer Sheet. Use the blank pages at the end of this booklet.',
    'Use of calculators, log tables, smart watches, or mobile devices is strictly prohibited.'
  ];

  const instructions = blueprint.instructions && blueprint.instructions.length > 0
    ? blueprint.instructions
    : defaultInstructions;

  // Step 1: Collect canonical base questions for Set P
  const baseSectionsMap: Array<{
    subjectConfig: BlueprintSubjectConfig;
    questions: RawQuestion[];
  }> = [];

  for (const subjCfg of blueprint.subjects) {
    let selected: RawQuestion[] = [];

    // Check if explicit question IDs were provided
    const poolKey = `${subjCfg.subject.toUpperCase()}_${subjCfg.klass}`;
    const explicitIds = blueprint.selectedQuestionIds?.[poolKey];

    if (explicitIds && explicitIds.length > 0) {
      const placeholders = explicitIds.map((_, i) => `$${i + 1}`).join(',');
      const sql = `SELECT * FROM questions WHERE id IN (${placeholders})`;
      const res = await queryQuestionPool<RawQuestion>(subjCfg.subject, subjCfg.klass, sql, explicitIds);
      selected = res.rows;
    } else {
      // Auto-pick questions from DB
      const chapters = subjCfg.chapters || [];
      const countNeeded = subjCfg.questionCount || 15;
      
      let whereClause = '1=1';
      const params: any[] = [];
      
      if (chapters.length > 0) {
        whereClause += ` AND chapter = ANY($1)`;
        params.push(chapters);
      }

      const sql = `
        SELECT * 
        FROM questions 
        WHERE ${whereClause} 
        ORDER BY RANDOM() 
        LIMIT ${countNeeded}
      `;
      const res = await queryQuestionPool<RawQuestion>(subjCfg.subject, subjCfg.klass, sql, params);
      selected = res.rows;
    }

    baseSectionsMap.push({
      subjectConfig: subjCfg,
      questions: selected
    });
  }

  // Calculate totals
  let totalQuestions = 0;
  let totalMarks = 0;
  baseSectionsMap.forEach(s => {
    totalQuestions += s.questions.length;
    totalMarks += s.questions.length * s.subjectConfig.marksPerQuestion;
  });

  // Step 2: Build Set P, Q, R, S
  const setCodes: Array<'P' | 'Q' | 'R' | 'S'> = ['P', 'Q', 'R', 'S'];
  const generatedSets: Record<string, ExamPaperSet> = {};

  for (const setCode of setCodes) {
    let globalQNumber = 1;
    const sections: ExamPaperSet['sections'] = [];
    const answerKey: Record<number, string> = {};
    const solutions: ExamPaperSet['solutions'] = [];

    for (const sectionData of baseSectionsMap) {
      const permuted = permuteQuestionsForSet(sectionData.questions, setCode);
      const processedList: ProcessedQuestion[] = [];

      for (const raw of permuted) {
        const currentQNum = globalQNumber++;
        let optA = raw.opt_a || '';
        let optB = raw.opt_b || '';
        let optC = raw.opt_c || '';
        let optD = raw.opt_d || '';
        let correctOption = (raw.correct_option || 'A').toUpperCase().trim();

        if (blueprint.shuffleOptions && setCode !== 'P') {
          const shuffled = shuffleQuestionOptions(raw);
          optA = shuffled.optA;
          optB = shuffled.optB;
          optC = shuffled.optC;
          optD = shuffled.optD;
          correctOption = shuffled.correctOption;
        }

        const cleanQuestion: ProcessedQuestion = {
          id: `${setCode}-${currentQNum}-${raw.id}`,
          originalId: raw.id,
          qNumber: currentQNum,
          subject: raw.subject || sectionData.subjectConfig.subject,
          klass: raw.klass || sectionData.subjectConfig.klass,
          chapter: raw.chapter || 'General',
          topic: raw.topic,
          qType: raw.q_type || 'MCQ',
          question: raw.question || '',
          optA,
          optB,
          optC,
          optD,
          correctOption,
          solutionText: raw.solution_text || `The correct option is (${correctOption}).`,
          marks: sectionData.subjectConfig.marksPerQuestion,
          negativeMarks: sectionData.subjectConfig.negativeMarks,
          assertion: raw.assertion,
          reason: raw.reason,
          columnA: raw.column_a,
          columnB: raw.column_b,
          matchOptions: raw.match_options,
          numAnswer: raw.num_answer
        };

        processedList.push(cleanQuestion);
        answerKey[currentQNum] = correctOption;

        solutions.push({
          qNumber: currentQNum,
          subject: cleanQuestion.subject,
          chapter: cleanQuestion.chapter,
          correctOption,
          solutionText: cleanQuestion.solutionText || `Correct Answer: Option (${correctOption})`
        });
      }

      sections.push({
        name: `SECTION - ${sectionData.subjectConfig.subject.toUpperCase()} (Class ${sectionData.subjectConfig.klass})`,
        subject: sectionData.subjectConfig.subject,
        instructions: `Questions ${processedList[0]?.qNumber || 1} to ${processedList[processedList.length - 1]?.qNumber || 1}. Each question carries ${sectionData.subjectConfig.marksPerQuestion} mark(s).`,
        questions: processedList
      });
    }

    generatedSets[setCode] = {
      setCode,
      title: blueprint.title,
      institutionName,
      academicYear,
      durationMinutes: blueprint.durationMinutes || 180,
      totalMarks,
      totalQuestions,
      instructions,
      sections,
      answerKey,
      solutions
    };
  }

  // Step 3: Build Master Cross-Set Answer Key Matrix
  const masterAnswerKeyMatrix: MasterAnswerKeyRow[] = [];
  const setP = generatedSets['P'];
  const setQ = generatedSets['Q'];
  const setR = generatedSets['R'];
  const setS = generatedSets['S'];

  // Flatten all questions for Set P
  const setPQuestions: ProcessedQuestion[] = [];
  setP.sections.forEach(s => setPQuestions.push(...s.questions));

  const setQQuestions: ProcessedQuestion[] = [];
  setQ.sections.forEach(s => setQQuestions.push(...s.questions));

  const setRQuestions: ProcessedQuestion[] = [];
  setR.sections.forEach(s => setRQuestions.push(...s.questions));

  const setSQuestions: ProcessedQuestion[] = [];
  setS.sections.forEach(s => setSQuestions.push(...s.questions));

  for (const qP of setPQuestions) {
    const origId = qP.originalId;
    const qQ = setQQuestions.find(q => q.originalId === origId) || qP;
    const qR = setRQuestions.find(q => q.originalId === origId) || qP;
    const qS = setSQuestions.find(q => q.originalId === origId) || qP;

    masterAnswerKeyMatrix.push({
      baseNumber: qP.qNumber,
      subject: qP.subject,
      chapter: qP.chapter,
      setKeys: {
        P: { qNumber: qP.qNumber, correct: qP.correctOption },
        Q: { qNumber: qQ.qNumber, correct: qQ.correctOption },
        R: { qNumber: qR.qNumber, correct: qR.correctOption },
        S: { qNumber: qS.qNumber, correct: qS.correctOption }
      }
    });
  }

  return {
    examId,
    title: blueprint.title,
    pattern: blueprint.pattern,
    institutionName,
    academicYear,
    durationMinutes: blueprint.durationMinutes,
    totalMarks,
    totalQuestions,
    instructions,
    createdAt: new Date().toISOString(),
    sets: {
      P: setP,
      Q: setQ,
      R: setR,
      S: setS
    },
    masterAnswerKeyMatrix
  };
}
