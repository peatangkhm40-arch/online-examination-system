import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';
const TOKEN_KEY = 'auth_token';

export async function getToken(): Promise<string | null> {
  return AsyncStorage.getItem(TOKEN_KEY);
}

export async function setToken(token: string): Promise<void> {
  await AsyncStorage.setItem(TOKEN_KEY, token);
}

export async function clearToken(): Promise<void> {
  await AsyncStorage.removeItem(TOKEN_KEY);
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  auth?: boolean;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (options.auth !== false) {
    const token = await getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error(data.error || 'คำขอมากเกินไป กรุณารอประมาณ 1 นาที แล้วลองเข้าสู่ระบบใหม่');
    }
    const details = Array.isArray(data.details)
      ? data.details.map((d: { message?: string }) => d.message).filter(Boolean).join(', ')
      : '';
    throw new Error(details || data.error || `Request failed (${response.status})`);
  }

  return data as T;
}

export const api = {
  login: (email: string, password: string) =>
    apiRequest<{ user: import('../types').User; token: string }>('/api/auth/login', {
      method: 'POST',
      body: { email, password },
      auth: false,
    }),

  register: (data: import('../types').RegisterStudentPayload) =>
    apiRequest<{ user: import('../types').User; token: string; message: string }>('/api/auth/register', {
      method: 'POST',
      body: data,
      auth: false,
    }),

  me: () => apiRequest<{ user: import('../types').User }>('/api/auth/me'),

  updateProfile: (data: import('../types').UpdateProfilePayload) =>
    apiRequest<{ user: import('../types').User; message: string }>('/api/auth/me', {
      method: 'PATCH',
      body: data,
    }),

  listExams: () => apiRequest<{ exams: import('../types').Exam[] }>('/api/exams'),

  joinByCode: (code: string) =>
    apiRequest<{
      type: 'classroom' | 'exam';
      message: string;
      classroom?: { id: string; name: string; joinCode: string; teacherName: string };
      examId?: string;
      exam?: { id: string; subjectName: string; classCode: string };
      user: import('../types').User;
    }>('/api/auth/join-classroom', {
      method: 'POST',
      body: { code },
    }),

  listGradeLevels: () =>
    apiRequest<{ gradeLevels: import('../types').GradeLevelOption[] }>('/api/exams/grade-levels'),

  listMySubjects: () =>
    apiRequest<{ subjects: import('../types').TeacherSubject[] }>('/api/teachers/subjects'),

  addSubject: (name: string) =>
    apiRequest<{ subject: import('../types').TeacherSubject }>('/api/teachers/subjects', {
      method: 'POST',
      body: { name },
    }),

  deleteSubject: (id: string) =>
    apiRequest<{ ok: boolean }>(`/api/teachers/subjects/${id}`, { method: 'DELETE' }),

  listMyClassrooms: () =>
    apiRequest<{ classrooms: import('../types').TeacherClassroom[] }>('/api/teachers/classrooms'),

  addClassroom: (data: { name: string; joinCode?: string; useRandomCode?: boolean }) =>
    apiRequest<{ classroom: import('../types').TeacherClassroom }>('/api/teachers/classrooms', {
      method: 'POST',
      body: data,
    }),

  deleteClassroom: (id: string) =>
    apiRequest<{ ok: boolean }>(`/api/teachers/classrooms/${id}`, { method: 'DELETE' }),

  getExam: (id: string) => apiRequest<{ exam: import('../types').ExamDetail }>(`/api/exams/${id}`),

  createExamRoom: (data: import('../types').CreateExamRoomPayload) =>
    apiRequest<{ exam: import('../types').Exam }>('/api/exams', {
      method: 'POST',
      body: data,
    }),

  importExamQuestions: (
    examId: string,
    data: { importFileName: string; importFileBase64: string; replaceExisting?: boolean }
  ) =>
    apiRequest<{ exam: import('../types').Exam; message: string }>(`/api/exams/${examId}/import`, {
      method: 'POST',
      body: data,
    }),

  updateExamStatus: (id: string, open: boolean) =>
    apiRequest<{ exam: import('../types').Exam }>(`/api/exams/${id}/status`, {
      method: 'PATCH',
      body: { status: open ? 'PUBLISHED' : 'DRAFT' },
    }),

  updateExam: (
    id: string,
    data: { subjectName?: string; gradeLevel?: string | null; roomStatus?: 'OPEN' | 'CLOSED' }
  ) =>
    apiRequest<{ exam: import('../types').Exam; message: string }>(`/api/exams/${id}`, {
      method: 'PATCH',
      body: data,
    }),

  deleteExam: (id: string) =>
    apiRequest<{ ok: boolean; exam: { id: string; subjectName: string; classCode: string } }>(`/api/exams/${id}`, {
      method: 'DELETE',
    }),

  addQuestion: (
    examId: string,
    data: {
      questionText: string;
      points?: number;
      options: { optionText: string; isCorrect: boolean }[];
    }
  ) =>
    apiRequest<{ question: import('../types').Question }>(`/api/exams/${examId}/questions`, {
      method: 'POST',
      body: data,
    }),

  updateQuestion: (
    examId: string,
    questionId: string,
    data: {
      questionText: string;
      points?: number;
      options: { optionText: string; isCorrect: boolean }[];
    }
  ) =>
    apiRequest<{ question: import('../types').Question; message: string }>(
      `/api/exams/${examId}/questions/${questionId}`,
      {
        method: 'PATCH',
        body: data,
      }
    ),

  deleteQuestion: (examId: string, questionId: string) =>
    apiRequest<{ ok: boolean }>(`/api/exams/${examId}/questions/${questionId}`, {
      method: 'DELETE',
    }),

  getTeacherDashboard: () =>
    apiRequest<{
      stats: import('../types').TeacherDashboardStats;
      recentCheats: import('../types').CheatLogItem[];
    }>('/api/teachers/dashboard'),

  listStudents: (page = 1, limit = 10, classroomId?: string) =>
    apiRequest<{
      students: import('../types').StudentListItem[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }>(
      `/api/teachers/students?page=${page}&limit=${limit}${classroomId ? `&classroomId=${encodeURIComponent(classroomId)}` : ''}`
    ),

  getExamResults: () =>
    apiRequest<{ results: import('../types').ExamResultRoom[] }>('/api/teachers/results'),

  // ดึง CSV รายงานคะแนน (คืนข้อความ CSV — ให้ฝั่ง UI สร้างไฟล์ดาวน์โหลด)
  fetchResultsCsv: async (examRoomId?: string) => {
    const token = await getToken();
    const query = examRoomId ? `?examRoomId=${encodeURIComponent(examRoomId)}` : '';
    const res = await fetch(`${API_URL}/api/teachers/results.csv${query}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new Error(`ดาวน์โหลดรายงานไม่สำเร็จ (${res.status})`);
    return res.text();
  },

  getTeacherSummary: () =>
    apiRequest<{
      totalStudents: number;
      totalExamRooms: number;
      totalCheatEvents: number;
      cheatAlerts: import('../types').CheatLogItem[];
      students: import('../types').StudentSummaryItem[];
    }>('/api/teachers/summary'),

  startAttempt: (examId: string) =>
    apiRequest<{ attempt: import('../types').ExamAttempt }>(`/api/attempts/start/${examId}`, {
      method: 'POST',
    }),

  listMyAttempts: () =>
    apiRequest<{ attempts: import('../types').StudentAttemptItem[] }>('/api/attempts/mine'),

  saveAnswer: (attemptId: string, questionId: string, selectedOptionId: string) =>
    apiRequest(`/api/attempts/${attemptId}/answers`, {
      method: 'PUT',
      body: { questionId, selectedOptionId },
    }),

  submitAttempt: (attemptId: string) =>
    apiRequest(`/api/attempts/${attemptId}/submit`, { method: 'POST' }),

  getAttempt: (attemptId: string) =>
    apiRequest<{ attempt: import('../types').ExamAttempt }>(`/api/attempts/${attemptId}`),

  reportCheatEvent: (
    attemptId: string,
    eventType: import('../types').CheatEventType,
    metadata?: Record<string, unknown>
  ) =>
    apiRequest(`/api/attempts/${attemptId}/cheat-events`, {
      method: 'POST',
      body: { eventType, metadata },
    }),

  listTeachers: () =>
    apiRequest<{ teachers: import('../types').TeacherAccount[] }>('/api/admin/teachers'),

  createTeacher: (data: { fullName: string; email: string; password: string }) =>
    apiRequest<{ teacher: import('../types').TeacherAccount; message: string }>('/api/admin/teachers', {
      method: 'POST',
      body: data,
    }),

  updateTeacher: (
    id: string,
    data: { fullName?: string; email?: string; password?: string; isActive?: boolean }
  ) =>
    apiRequest<{ teacher: import('../types').TeacherAccount; message: string }>(`/api/admin/teachers/${id}`, {
      method: 'PATCH',
      body: data,
    }),

  setTeacherActive: (id: string, isActive: boolean) =>
    apiRequest<{ teacher: import('../types').TeacherAccount; message: string }>(
      `/api/admin/teachers/${id}/active`,
      {
        method: 'PATCH',
        body: { isActive },
      }
    ),

  deleteTeacher: (id: string) =>
    apiRequest<{ ok: boolean; message: string }>(`/api/admin/teachers/${id}`, { method: 'DELETE' }),

  listAdminStudents: () =>
    apiRequest<{ students: import('../types').AdminStudentAccount[] }>('/api/admin/students'),

  updateAdminStudent: (
    id: string,
    data: {
      email?: string;
      prefix?: import('../types').TitlePrefix;
      firstName?: string;
      lastName?: string;
      gradeLevel?: string;
      studentNumber?: number;
      password?: string;
      isActive?: boolean;
      isCollegeVerified?: boolean;
    }
  ) =>
    apiRequest<{ student: import('../types').AdminStudentAccount; message: string }>(
      `/api/admin/students/${id}`,
      { method: 'PATCH', body: data }
    ),

  deleteAdminStudent: (id: string) =>
    apiRequest<{ ok: boolean; message: string }>(`/api/admin/students/${id}`, { method: 'DELETE' }),

  listAdminExams: () =>
    apiRequest<{ exams: import('../types').AdminExamItem[] }>('/api/admin/exams'),

  setAdminExamOpen: (id: string, open: boolean) =>
    apiRequest<{ exam: import('../types').Exam; message: string }>(`/api/admin/exams/${id}/status`, {
      method: 'PATCH',
      body: { open },
    }),

  deleteAdminExam: (id: string) =>
    apiRequest<{ ok: boolean; message: string }>(`/api/admin/exams/${id}`, { method: 'DELETE' }),

  listAdminClassrooms: () =>
    apiRequest<{ classrooms: import('../types').AdminClassroomItem[] }>('/api/admin/classrooms'),

  deleteAdminClassroom: (id: string) =>
    apiRequest<{ ok: boolean; message: string }>(`/api/admin/classrooms/${id}`, { method: 'DELETE' }),
};
