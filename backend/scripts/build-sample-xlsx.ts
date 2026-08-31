import { readFileSync, writeFileSync } from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';

const jsonPath = path.resolve(__dirname, '../../frontend/public/sample-exam.json');
const outPath = path.resolve(__dirname, '../../frontend/public/sample-exam.xlsx');

const data = JSON.parse(readFileSync(jsonPath, 'utf8')) as {
  questions: Array<{
    questionText: string;
    options: Array<{ optionText: string; isCorrect: boolean }>;
  }>;
};

const labels = ['ก', 'ข', 'ค', 'ง', 'จ', 'ฉ'];
const rows: string[][] = [['คำถาม', 'ก', 'ข', 'ค', 'ง', 'คำตอบ']];

for (const q of data.questions) {
  const opts = q.options.slice(0, 4);
  while (opts.length < 4) opts.push({ optionText: '-', isCorrect: false });
  const correctIndex = opts.findIndex((o) => o.isCorrect);
  rows.push([
    q.questionText,
    opts[0]?.optionText ?? '',
    opts[1]?.optionText ?? '',
    opts[2]?.optionText ?? '',
    opts[3]?.optionText ?? '',
    labels[Math.max(0, correctIndex)] ?? 'ก',
  ]);
}

const ws = XLSX.utils.aoa_to_sheet(rows);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'ข้อสอบ');
writeFileSync(outPath, XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
console.log('wrote', outPath, 'rows', rows.length - 1);
