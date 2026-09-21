import { db } from '../database/db';

export interface DetectionResult {
  studentId: string;
  studentName: string;
  registerNumber: string;
  photoUrl?: string;
  suggestedStatus: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED' | 'MEDICAL' | 'ON_LEAVE';
  confidence: number;
  matchStatus: 'CONFIRMED' | 'UNCERTAIN' | 'NOT_DETECTED' | 'UNKNOWN';
  boundingBox?: { x: number; y: number; width: number; height: number };
}

export const faceDetectionService = {
  /**
   * Local modular face detection & matching simulation.
   * Analyzes an uploaded classroom photo, matches against enrolled students in that class/section/batch,
   * and generates attendance suggestions with confidence scores for human verification.
   */
  async processClassroomPhoto(
    lectureSessionId: string,
    photoPath: string
  ): Promise<{ detectedCount: number; unknownCount: number; results: DetectionResult[] }> {
    // 1. Fetch lecture details
    const lecture = db.prepare(`
      SELECT class_id, section_id, batch_id FROM lecture_sessions WHERE id = ?
    `).get(lectureSessionId) as { class_id: string; section_id: string; batch_id: string } | undefined;

    if (!lecture) {
      throw new Error('Lecture session not found.');
    }

    // 2. Fetch all enrolled students for this class/section/batch
    const students = db.prepare(`
      SELECT id, name, register_number, photo_url 
      FROM student_profiles 
      WHERE class_id = ? AND section_id = ? AND batch_id = ?
      ORDER BY name ASC
    `).all(lecture.class_id, lecture.section_id, lecture.batch_id) as Array<{
      id: string;
      name: string;
      register_number: string;
      photo_url?: string;
    }>;

    // 3. Local detection simulation (deterministic based on student hash or realistic distribution)
    let detectedCount = 0;
    const results: DetectionResult[] = students.map((student, idx) => {
      // Simulate realistic detection patterns (e.g. 80% confirmed present, 10% uncertain, 10% not detected)
      const pseudoRand = (student.name.charCodeAt(0) + idx * 7) % 100;
      
      let suggestedStatus: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED' | 'MEDICAL' | 'ON_LEAVE' = 'PRESENT';
      let confidence = 0.95;
      let matchStatus: 'CONFIRMED' | 'UNCERTAIN' | 'NOT_DETECTED' | 'UNKNOWN' = 'CONFIRMED';

      if (pseudoRand < 65) {
        suggestedStatus = 'PRESENT';
        confidence = parseFloat((0.88 + (pseudoRand % 10) * 0.01).toFixed(2));
        matchStatus = 'CONFIRMED';
        detectedCount++;
      } else if (pseudoRand < 80) {
        suggestedStatus = 'PRESENT';
        confidence = parseFloat((0.65 + (pseudoRand % 10) * 0.01).toFixed(2));
        matchStatus = 'UNCERTAIN';
        detectedCount++;
      } else if (pseudoRand < 90) {
        suggestedStatus = 'LATE';
        confidence = 0.78;
        matchStatus = 'CONFIRMED';
        detectedCount++;
      } else {
        suggestedStatus = 'ABSENT';
        confidence = 0.12;
        matchStatus = 'NOT_DETECTED';
      }

      return {
        studentId: student.id,
        studentName: student.name,
        registerNumber: student.register_number,
        photoUrl: student.photo_url,
        suggestedStatus,
        confidence,
        matchStatus,
        boundingBox: {
          x: (idx * 110) % 600 + 40,
          y: Math.floor(idx / 5) * 120 + 60,
          width: 80,
          height: 90
        }
      };
    });

    return {
      detectedCount,
      unknownCount: 0,
      results
    };
  }
};
