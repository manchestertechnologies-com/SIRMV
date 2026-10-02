import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import {
  getSubjectMeta,
  searchQuestions,
  generateExamSuite,
  BlueprintRequest,
  GeneratedExamSuite
} from '../services/questionPaperEngine';
import { getAllPoolHealth } from '../database/questionPools';
import { evaluateOMRSubmission, OMREvaluationRequest } from '../services/omrService';

export const questionPapersRouter = Router();

const PAPERS_STORAGE_DIR = path.join(__dirname, '..', '..', 'uploads', 'generated_papers');
if (!fs.existsSync(PAPERS_STORAGE_DIR)) {
  fs.mkdirSync(PAPERS_STORAGE_DIR, { recursive: true });
}

/**
 * Health check across all 8 live PostgreSQL question pools
 */
questionPapersRouter.get('/pools-health', async (req: Request, res: Response) => {
  try {
    const health = await getAllPoolHealth();
    res.json({ success: true, pools: health });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Get chapters and metadata for a subject & class
 */
questionPapersRouter.get('/meta', async (req: Request, res: Response) => {
  try {
    const subject = (req.query.subject as string) || 'PHYSICS';
    const klass = (req.query.klass as string) || '11';

    const meta = await getSubjectMeta(subject, klass);
    res.json({ success: true, meta });
  } catch (err: any) {
    console.error('Meta API Error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Search & filter questions in a subject database
 */
questionPapersRouter.post('/search', async (req: Request, res: Response) => {
  try {
    const {
      subject = 'PHYSICS',
      klass = '11',
      chapter,
      topic,
      qType,
      keyword,
      examTag,
      limit = 50,
      offset = 0
    } = req.body;

    const result = await searchQuestions(subject, klass, {
      chapter,
      topic,
      qType,
      keyword,
      examTag,
      limit: parseInt(limit.toString(), 10),
      offset: parseInt(offset.toString(), 10)
    });

    res.json({ success: true, ...result });
  } catch (err: any) {
    console.error('Search Questions API Error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Generate 4-Set Examination Suite (P, Q, R, S)
 */
questionPapersRouter.post('/generate', async (req: Request, res: Response) => {
  try {
    const blueprint: BlueprintRequest = req.body;

    if (!blueprint.title || !blueprint.subjects || blueprint.subjects.length === 0) {
      return res.status(400).json({ error: 'Exam title and at least one subject configuration are required.' });
    }

    const examSuite = await generateExamSuite(blueprint);

    // Persist automatically to storage
    const filePath = path.join(PAPERS_STORAGE_DIR, `${examSuite.examId}.json`);
    fs.writeFileSync(filePath, JSON.stringify(examSuite, null, 2), 'utf-8');

    res.json({ success: true, examSuite });
  } catch (err: any) {
    console.error('Generate Exam Suite Error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Evaluate student OMR submission against set answer key
 */
questionPapersRouter.post('/evaluate-omr', async (req: Request, res: Response) => {
  try {
    const evalReq: OMREvaluationRequest = req.body;
    const result = evaluateOMRSubmission(evalReq);
    res.json({ success: true, result });
  } catch (err: any) {
    console.error('Evaluate OMR Error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * List saved exam papers
 */
questionPapersRouter.get('/saved', async (req: Request, res: Response) => {
  try {
    if (!fs.existsSync(PAPERS_STORAGE_DIR)) {
      return res.json({ success: true, papers: [] });
    }

    const files = fs.readdirSync(PAPERS_STORAGE_DIR).filter(f => f.endsWith('.json'));
    const papers: any[] = [];

    for (const f of files.slice(0, 30)) {
      try {
        const content = fs.readFileSync(path.join(PAPERS_STORAGE_DIR, f), 'utf-8');
        const parsed = JSON.parse(content);
        papers.push({
          examId: parsed.examId,
          title: parsed.title,
          pattern: parsed.pattern,
          academicYear: parsed.academicYear,
          totalQuestions: parsed.totalQuestions,
          totalMarks: parsed.totalMarks,
          durationMinutes: parsed.durationMinutes,
          createdAt: parsed.createdAt
        });
      } catch (e) {
        // Skip corrupt files
      }
    }

    papers.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json({ success: true, papers });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Get a specific saved exam paper
 */
questionPapersRouter.get('/saved/:examId', async (req: Request, res: Response) => {
  try {
    const { examId } = req.params;
    const filePath = path.join(PAPERS_STORAGE_DIR, `${examId}.json`);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Exam paper not found.' });
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const examSuite = JSON.parse(content);
    res.json({ success: true, examSuite });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
