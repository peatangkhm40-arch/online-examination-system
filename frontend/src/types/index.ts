export type Role = 'ADMIN' | 'TEACHER' | 'STUDENT';

export type TitlePrefix = 'MR' | 'MISS' | 'MRS';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  prefix?: TitlePrefix;
  firstName?: string;
  lastName?: string;
  /** ระดับชั้นตอนลงทะเบียน */
  gradeLevel?: string;
  studentNumber?: number;
  /** แอดมินยืนยันแล้วว่าเป็นนักเรียนวิทยาลัย */
  isCollegeVerified?: boolean;
  /** ชื่อห้องเรียนที่เข้าด้วยรหัสจากอาจารย์ */
  classroomName?: string | null;
  classroomJoinCode?: string | null;
}

export interface UpdateProfilePayload {
  email?: string;
  fullName?: string;
  prefix?: TitlePrefix;
  firstName?: string;
  lastName?: string;
  gradeLevel?: string;
  studentNumber?: number;
  currentPassword?: string;
  newPassword?: string;
}

export interface RegisterStudentPayload {
  prefix: TitlePrefix;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  gradeLevel: string;
  studentNumber: number;
}

export interface Exam {
  id: string;
  title: string;
  description?: string;
  classCode?: string;
  gradeLevel?: string | null;
  examFormat?: 'MANUAL' | 'IMPORT_FILE';
  examSource?: string | null;
  durationMinutes: number;
  passingScore: number;
  status: string;
  createdAt?: string;
  _count?: { questions: number; attempts?: number };
}

export interface CreateExamRoomPayload {
  subjectName: string;
  gradeLevel?: string;
  examFormat: 'MANUAL' | 'IMPORT_FILE';
  roomStatus: 'OPEN' | 'CLOSED';
  classCode?: string;
  examSource?: string;
  useRandomCode?: boolean;
  importFileName?: string;
  importFileBase64?: string;
}

export interface GradeLevelOption {
  gradeLevel: string;
  studentCount: number;
}

export interface TeacherAccount {
  id: string;
  email: string;
  fullName: string;
  isActive: boolean;
  createdAt: string;
}

export interface TeacherSubject {
  id: string;
  name: string;
}

export interface TeacherClassroom {
  id: string;
  name: string;
  joinCode: string;
  studentCount: number;
  createdAt?: string;
}

export interface TeacherDashboardStats {
  studentCount: number;
  examRoomCount: number;
  cheatCount: number;
}

export interface CheatLogItem {
  id: string;
  eventType: string;
  description?: string | null;
  isNotified: boolean;
  createdAt: string;
  studentName: string;
  gradeLevel: string;
  studentNumber: number;
  subjectName: string;
  classCode: string;
}

export interface StudentListItem {
  id: string;
  prefix: TitlePrefix;
  prefixLabel: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  gradeLevel: string;
  studentNumber: number;
  classroomName?: string | null;
}

export interface StudentSummaryItem {
  id: string;
  studentNumber: number;
  fullName: string;
  gradeLevel: string;
  email: string;
  score: number | null;
  cheatCount: number;
  isCheating: boolean;
}

export interface QuestionOption {
  id: string;
  optionText: string;
  orderIndex: number;
  isCorrect?: boolean;
}

export interface Question {
  id: string;
  questionText: string;
  points: number;
  orderIndex: number;
  options: QuestionOption[];
}

export interface ExamDetail extends Exam {
  questions: Question[];
  createdBy?: { fullName: string };
}

export interface AdminStudentAccount {
  id: string;
  email: string;
  fullName: string;
  prefix: TitlePrefix;
  firstName: string;
  lastName: string;
  gradeLevel: string;
  studentNumber: number;
  isActive: boolean;
  isCollegeVerified: boolean;
  classroomName: string | null;
  createdAt: string;
}

export interface AdminExamItem {
  id: string;
  subjectName: string;
  classCode: string;
  gradeLevel: string | null;
  status: string;
  teacherName: string;
  questionCount: number;
  createdAt: string;
}

export interface AdminClassroomItem {
  id: string;
  name: string;
  joinCode: string;
  teacherName: string;
  studentCount: number;
  createdAt: string;
}

export interface ExamAttempt {
  id: string;
  examId: string;
  status: string;
  score?: number;
  maxScore?: number;
  startedAt: string;
  submittedAt?: string;
  cheatFlags: number;
  exam?: { title: string; durationMinutes: number };
}

export interface ExamResultAttempt {
  attemptId: string;
  studentId: string;
  studentNumber: number;
  fullName: string;
  gradeLevel: string;
  email: string;
  status: 'IN_PROGRESS' | 'SUBMITTED' | 'DISQUALIFIED';
  score: number | null;
  maxScore: number | null;
  startedAt: string;
  submittedAt: string | null;
  cheatCount: number;
}

export interface ExamResultRoom {
  room: {
    id: string;
    subjectName: string;
    classCode: string;
    gradeLevel: string | null;
    questionCount: number;
  };
  attempts: ExamResultAttempt[];
}

export interface StudentAttemptItem {
  id: string;
  examId: string;
  subjectName: string;
  classCode: string;
  gradeLevel: string | null;
  status: 'IN_PROGRESS' | 'SUBMITTED' | 'DISQUALIFIED';
  score: number | null;
  maxScore: number | null;
  percent: number | null;
  startedAt: string;
  submittedAt: string | null;
  cheatFlags: number;
}

export type CheatEventType =
  | 'TAB_SWITCH'
  | 'WINDOW_BLUR'
  | 'COPY_ATTEMPT'
  | 'PASTE_ATTEMPT'
  | 'FULLSCREEN_EXIT'
  | 'RIGHT_CLICK'
  | 'DEVTOOLS_SUSPECTED'
  | 'OTHER';
