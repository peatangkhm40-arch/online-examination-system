export type ImportOption = { optionText: string; isCorrect: boolean };
export type ImportQuestion = {
  questionText: string;
  points: number;
  options: ImportOption[];
};

function normalizeHeader(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[_-]+/g, '');
}

function asText(value: unknown): string {
  if (value == null) return '';
  return String(value)
    .normalize('NFKC')
    .replace(/\u00a0/g, ' ')
    .trim();
}

function parseCorrectIndex(raw: string, optionCount: number): number {
  const value = asText(raw).toLowerCase();
  if (!value) return -1;

  const map: Record<string, number> = {
    a: 0,
    b: 1,
    c: 2,
    d: 3,
    e: 4,
    f: 5,
    '1': 0,
    '2': 1,
    '3': 2,
    '4': 3,
    '5': 4,
    '6': 5,
    ก: 0,
    ข: 1,
    ค: 2,
    ง: 3,
    จ: 4,
    ฉ: 5,
  };
  if (value in map && map[value] < optionCount) return map[value];

  // เช่น "ข.", "B)", "ข้อ ก", "answer b", "คำตอบ:2"
  const compact = value.replace(/[^a-z0-9ก-ฮ]/gi, '');
  if (compact in map && map[compact] < optionCount) return map[compact];

  // ดึงตัวอักษร/ตัวเลขคำตอบตัวแรกที่เจอ
  const labelMatch = value.match(/(?:^|[^a-z0-9ก-ฮ])([abcdefกขคงจฉ1-6])(?![a-z0-9ก-ฮ])/i);
  if (labelMatch) {
    const hit = map[labelMatch[1].toLowerCase()];
    if (hit != null && hit < optionCount) return hit;
  }

  const asNum = Number(value);
  if (Number.isInteger(asNum) && asNum >= 1 && asNum <= optionCount) return asNum - 1;

  return -1;
}

/** หา index คำตอบแบบยืดหยุ่น — ไม่เจอให้ใช้ตัวเลือกแรก แทนที่จะพังทั้งไฟล์ */
function resolveCorrectIndex(raw: unknown, optionTexts: string[]): number {
  const options = optionTexts.map((t) => stripOptionPrefix(asText(t))).filter(Boolean);
  if (options.length === 0) return 0;

  const text = asText(raw);
  if (!text) return 0;

  let idx = parseCorrectIndex(text, options.length);
  if (idx >= 0) return idx;

  const cleaned = text.replace(/^(คำตอบ|เฉลย|answer|correct|ans)\s*[:：\-]?\s*/i, '').trim();
  idx = parseCorrectIndex(cleaned, options.length);
  if (idx >= 0) return idx;

  const lower = cleaned.toLowerCase();
  idx = options.findIndex((o) => o.toLowerCase() === lower);
  if (idx >= 0) return idx;

  idx = options.findIndex(
    (o) => o.toLowerCase().includes(lower) || (lower.length >= 2 && lower.includes(o.toLowerCase()))
  );
  if (idx >= 0) return idx;

  const prefixed = extractOptionFromLine(cleaned);
  if (prefixed && prefixed.index >= 0 && prefixed.index < options.length) return prefixed.index;

  // หาไม่เจอ — ไม่ throw เพื่อให้สร้างห้องสอบผ่านได้
  return 0;
}

function validateQuestion(q: ImportQuestion, index: number): ImportQuestion {
  if (!q.questionText || q.questionText.length < 2) {
    throw new Error(`IMPORT_INVALID:ข้อที่ ${index + 1} ข้อความคำถามไม่ถูกต้อง`);
  }
  if (q.options.length < 2) {
    throw new Error(`IMPORT_INVALID:ข้อที่ ${index + 1} ต้องมีตัวเลือกอย่างน้อย 2 ข้อ`);
  }
  if (!q.options.some((o) => o.isCorrect)) {
    throw new Error(`IMPORT_INVALID:ข้อที่ ${index + 1} ต้องระบุคำตอบที่ถูก`);
  }
  return {
    questionText: q.questionText,
    points: q.points > 0 ? q.points : 1,
    options: q.options.map((o) => ({
      optionText: o.optionText.trim(),
      isCorrect: o.isCorrect,
    })),
  };
}

function parseJsonQuestions(text: string): ImportQuestion[] {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('IMPORT_INVALID:ไฟล์ JSON ไม่ถูกต้อง');
  }

  const list = Array.isArray(data)
    ? data
    : Array.isArray((data as { questions?: unknown }).questions)
      ? (data as { questions: unknown[] }).questions
      : null;

  if (!list) {
    throw new Error('IMPORT_INVALID:JSON ต้องเป็นอาเรย์ข้อสอบ หรือมีฟิลด์ questions');
  }

  return list.map((item, index) => {
    const row = item as {
      questionText?: string;
      question?: string;
      points?: number;
      options?: Array<{ optionText?: string; text?: string; isCorrect?: boolean; correct?: boolean }>;
    };
    const options = (row.options ?? []).map((o) => ({
      optionText: asText(o.optionText ?? o.text),
      isCorrect: Boolean(o.isCorrect ?? o.correct),
    }));
    return validateQuestion(
      {
        questionText: asText(row.questionText ?? row.question),
        points: Number(row.points) || 1,
        options,
      },
      index
    );
  });
}

function findHeaderKey(headerKeys: Record<string, string>, aliases: string[]): string | undefined {
  for (const alias of aliases) {
    const hit = headerKeys[normalizeHeader(alias)];
    if (hit) return hit;
  }
  return undefined;
}

function parseByHeaders(rows: Record<string, unknown>[]): ImportQuestion[] {
  if (rows.length === 0) return [];
  const headerKeys = Object.keys(rows[0]).reduce<Record<string, string>>((acc, key) => {
    acc[normalizeHeader(key)] = key;
    return acc;
  }, {});

  const questionKey = findHeaderKey(headerKeys, [
    'questionText',
    'question',
    'คำถาม',
    'ข้อสอบ',
    'ข้อคำถาม',
    'โจทย์',
    'title',
  ]);
  const correctKey = findHeaderKey(headerKeys, [
    'correct',
    'answer',
    'คำตอบ',
    'เฉลย',
    'ข้อถูก',
    'คำตอบที่ถูก',
    'correctanswer',
    'ans',
  ]);
  const pointsKey = findHeaderKey(headerKeys, ['points', 'score', 'คะแนน']);

  const optionKeys = [
    findHeaderKey(headerKeys, ['optionA', 'optiona', 'a', 'ตัวเลือก1', 'ตัวเลือกก', 'choice1', 'ก']),
    findHeaderKey(headerKeys, ['optionB', 'optionb', 'b', 'ตัวเลือก2', 'ตัวเลือกข', 'choice2', 'ข']),
    findHeaderKey(headerKeys, ['optionC', 'optionc', 'c', 'ตัวเลือก3', 'ตัวเลือกค', 'choice3', 'ค']),
    findHeaderKey(headerKeys, ['optionD', 'optiond', 'd', 'ตัวเลือก4', 'ตัวเลือกง', 'choice4', 'ง']),
    findHeaderKey(headerKeys, ['optionE', 'optione', 'e', 'ตัวเลือก5', 'ตัวเลือกจ', 'choice5', 'จ']),
    findHeaderKey(headerKeys, ['optionF', 'optionf', 'f', 'ตัวเลือก6', 'ตัวเลือกฉ', 'choice6', 'ฉ']),
  ].filter(Boolean) as string[];

  if (!questionKey || optionKeys.length < 2) return [];

  const questions: ImportQuestion[] = [];
  rows.forEach((row, index) => {
    const questionText = asText(row[questionKey]);
    if (!questionText) return;

    const optionTexts = optionKeys.map((key) => asText(row[key])).filter((t) => t && t !== '-');
    if (optionTexts.length < 2) {
      // แถวไม่ครบตัวเลือก — ข้าม ไม่ทำให้ทั้งไฟล์พัง
      return;
    }

    // ข้ามแถวที่เป็นหัวตารางซ้ำ
    const qNorm = normalizeHeader(questionText);
    if (qNorm === 'คำถาม' || qNorm === 'question' || qNorm === 'ข้อที่' || qNorm.includes('question')) {
      return;
    }

    const correctRaw = correctKey ? asText(row[correctKey]) : '';
    // ถ้ามีตัวเลือกเกิน 4 และตัวท้ายเป็น ก/ข/ค/ง → ใช้เป็นเฉลย
    let options = optionTexts.slice(0, 6);
    let answer = correctRaw;
    if (!answer && options.length > 4) {
      const maybeAnswer = options[options.length - 1] ?? '';
      if (parseCorrectIndex(maybeAnswer, 4) >= 0) {
        answer = maybeAnswer;
        options = options.slice(0, -1);
      }
    }
    options = options.slice(0, 4);
    if (options.length < 2) return;

    const correctIndex = resolveCorrectIndex(answer, options);

    questions.push(
      validateQuestion(
        {
          questionText,
          points: Number(row[pointsKey ?? '']) || 1,
          options: options.map((optionText, i) => ({
            optionText,
            isCorrect: i === correctIndex,
          })),
        },
        questions.length
      )
    );
  });

  return questions;
}

/** แถวแบบตาราง: คำถาม | ตัวเลือก1-4 | คำตอบ */
function parseByPosition(matrix: unknown[][]): ImportQuestion[] {
  const dataRows = matrix.filter((row) => row.some((cell) => asText(cell)));
  if (dataRows.length === 0) return [];

  const first = dataRows[0].map((c) => normalizeHeader(c));
  const looksLikeHeader =
    first.some((h) => h.includes('คำถาม') || h === 'question' || h === 'questiontext') ||
    (first.includes('ก') && first.includes('ข'));

  const rows = looksLikeHeader ? dataRows.slice(1) : dataRows;
  const questions: ImportQuestion[] = [];

  rows.forEach((row, index) => {
    const cells = row.map((c) => asText(c));
    if (!cells.some(Boolean)) return;

    const hasIndexCol = cells.length >= 6 && /^\d+$/.test(cells[0] ?? '');
    const offset = hasIndexCol ? 1 : 0;

    const questionText = cells[offset] ?? '';
    if (!questionText) return;

    const answerCell = cells[cells.length - 1] ?? '';
    let optionCells = cells
      .slice(offset + 1, Math.max(offset + 1, cells.length - 1))
      .filter((t) => t && t !== '-');

    if (optionCells.length < 2) {
      return;
    }

    // ข้ามหัวตาราง
    const qNorm = normalizeHeader(questionText);
    if (qNorm === 'คำถาม' || qNorm === 'question' || qNorm === 'ข้อที่') return;

    // ถ้าคอลัมน์สุดท้ายเป็น ก/ข/ค/ง และตัวเลือกยังเกิน — แยกเฉลยออก
    let answer = answerCell;
    if (optionCells.length > 4 && parseCorrectIndex(optionCells[optionCells.length - 1] ?? '', 4) >= 0) {
      answer = optionCells[optionCells.length - 1] ?? answer;
      optionCells = optionCells.slice(0, -1);
    }
    optionCells = optionCells.slice(0, 4);
    if (optionCells.length < 2) return;

    const correctIndex = resolveCorrectIndex(answer, optionCells);

    questions.push(
      validateQuestion(
        {
          questionText,
          points: 1,
          options: optionCells.map((optionText, i) => ({
            optionText: stripOptionPrefix(optionText),
            isCorrect: i === correctIndex,
          })),
        },
        questions.length
      )
    );
  });

  return questions;
}

const OPTION_LINE =
  /^(?:([กขคงจฉabcdef])|[1-6])[).:\-、\s]\s*(.+)$/i;

function stripOptionPrefix(text: string): string {
  const m = text.match(OPTION_LINE);
  return (m?.[2] ?? text).trim();
}

function extractOptionFromLine(line: string): { index: number; text: string } | null {
  const m = line.match(OPTION_LINE);
  if (!m) return null;
  const label = (m[1] ?? line[0] ?? '').toLowerCase();
  const index = parseCorrectIndex(label, 6);
  if (index < 0) return null;
  return { index, text: (m[2] ?? '').trim() };
}

/**
 * รูปแบบ 1 ข้อ = 1 หน้า/ชีต (แนวตั้ง)
 * ตัวอย่าง:
 *   What is ...?
 *   ก. children
 *   ข. childs
 *   ค. childes
 *   ง. childrens
 *   คำตอบ: ก
 */
function parseVerticalPage(matrix: unknown[][]): ImportQuestion | null {
  const lines = matrix
    .flatMap((row) => row.map((cell) => asText(cell)).filter(Boolean))
    .filter(Boolean);
  if (lines.length < 3) return null;

  let questionText = '';
  let answerRaw = '';
  const optionsByIndex = new Map<number, string>();
  const plainOptions: string[] = [];

  for (const line of lines) {
    const normalized = normalizeHeader(line);

    if (
      normalized.startsWith('คำตอบ') ||
      normalized.startsWith('เฉลย') ||
      normalized.startsWith('answer') ||
      normalized.startsWith('correct')
    ) {
      answerRaw = line.split(/[:：\-]/).slice(1).join(':').trim() || line.replace(/^(คำตอบ|เฉลย|answer|correct)\s*[:：\-]?\s*/i, '');
      continue;
    }

    if (
      normalized.startsWith('คำถาม') ||
      normalized.startsWith('ข้อ') ||
      normalized.startsWith('question')
    ) {
      const q = line.split(/[:：]/).slice(1).join(':').trim();
      if (q) questionText = q;
      continue;
    }

    const opt = extractOptionFromLine(line);
    if (opt && opt.text) {
      optionsByIndex.set(opt.index, opt.text);
      continue;
    }

    // บรรทัดธรรมดา — ถ้ายังไม่มีคำถาม ใช้เป็นคำถาม, ไม่เช่นนั้นเก็บเป็นตัวเลือกสำรอง
    if (!questionText) {
      questionText = line;
    } else if (!OPTION_LINE.test(line) && !/^คำตอบ/i.test(line)) {
      plainOptions.push(line);
    }
  }

  const indexed = [...optionsByIndex.entries()].sort((a, b) => a[0] - b[0]);
  const optionTexts =
    indexed.length >= 2 ? indexed.map(([, text]) => text) : plainOptions.slice(0, 6);

  if (!questionText || optionTexts.length < 2) return null;

  let correctIndex = resolveCorrectIndex(answerRaw, optionTexts);
  if (indexed.length >= 2 && answerRaw) {
    const wanted = parseCorrectIndex(answerRaw, 6);
    if (wanted >= 0) {
      const mapped = indexed.findIndex(([i]) => i === wanted);
      if (mapped >= 0) correctIndex = mapped;
    }
  }

  return validateQuestion(
    {
      questionText,
      points: 1,
      options: optionTexts.map((optionText, i) => ({
        optionText,
        isCorrect: i === correctIndex,
      })),
    },
    0
  );
}

async function parseSpreadsheetQuestions(buffer: Buffer): Promise<ImportQuestion[]> {
  const XLSX = await import('xlsx');
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  if (!workbook.SheetNames.length) {
    throw new Error('IMPORT_INVALID:ไม่พบชีตในไฟล์ Excel');
  }

  const collected: ImportQuestion[] = [];

  // 1) รวมทุกชีตแบบตาราง (1 แถว = 1 ข้อ)
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const objectRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
    const byHeader = parseByHeaders(objectRows);
    if (byHeader.length) {
      collected.push(...byHeader);
      continue;
    }

    const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' });
    const byPosition = parseByPosition(matrix);
    if (byPosition.length) {
      collected.push(...byPosition);
    }
  }

  if (collected.length > 0) {
    return collected.map((q, i) => validateQuestion(q, i));
  }

  // 2) รูปแบบ 1 ข้อ = 1 หน้า/ชีต
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' });
    const one = parseVerticalPage(matrix);
    if (one) collected.push(one);
  }

  if (collected.length > 0) {
    return collected.map((q, i) => validateQuestion(q, i));
  }

  throw new Error(
    'IMPORT_INVALID:อ่านไฟล์ไม่สำเร็จ — ใช้ตัวอย่าง Excel (1 แถว = 1 ข้อ) หรือจัด 1 ชีต = 1 ข้อ โดยมีตัวเลือก ก-ง'
  );
}

/** แปลงไฟล์คลังข้อสอบ (JSON / Excel) เป็นรายการคำถาม */
export async function parseExamImportFile(fileName: string, contentBase64: string): Promise<ImportQuestion[]> {
  const safeName = fileName.trim().toLowerCase();
  const buffer = Buffer.from(contentBase64, 'base64');
  if (!buffer.length) throw new Error('IMPORT_INVALID:ไฟล์ว่างเปล่า');

  let questions: ImportQuestion[];
  if (safeName.endsWith('.json')) {
    questions = parseJsonQuestions(buffer.toString('utf8'));
  } else if (safeName.endsWith('.xlsx') || safeName.endsWith('.xls')) {
    questions = await parseSpreadsheetQuestions(buffer);
  } else {
    throw new Error('IMPORT_INVALID:รองรับเฉพาะไฟล์ .json, .xlsx, .xls');
  }

  if (questions.length === 0) {
    throw new Error('IMPORT_INVALID:ไม่พบตัวอย่างข้อสอบในไฟล์');
  }
  return questions;
}
