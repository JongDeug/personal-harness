#!/usr/bin/env node
/**
 * Coverage 결과를 HTML 이메일로 발송하는 스크립트
 * Usage: node <skill-dir>/scripts/send-coverage-mail.mjs <recipient> <coverage-file> [project-name] [project-dir] [version]
 */

import nodemailer from 'nodemailer';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import * as dotenv from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
const skillDir = resolve(__dirname, '..');

// node_modules는 스킬 디렉토리 기준으로 로드
const recipient = process.argv[2];
const coverageFile = process.argv[3];
const projectName = process.argv[4] || 'project';
const projectDir = process.argv[5] || process.cwd();
const version = process.argv[6] || 'untagged';

if (!recipient || !coverageFile) {
  console.error('Usage: node send-coverage-mail.mjs <recipient> <coverage-file> [project-name] [project-dir] [version]');
  process.exit(1);
}

// .env 로드 - 스킬 디렉토리 기준
dotenv.config({ path: resolve(skillDir, '.env') });

const MAIL_USER = process.env.MAIL_USER;
const MAIL_PASS = process.env.MAIL_PASS;

if (!MAIL_USER || !MAIL_PASS) {
  console.error('❌ .env에 MAIL_USER와 MAIL_PASS를 설정해주세요.');
  console.error('   MAIL_USER=your@gmail.com');
  console.error('   MAIL_PASS=앱비밀번호16자리');
  process.exit(1);
}

const coverageText = readFileSync(coverageFile, 'utf8');
const rows = parseCoverage(coverageText);
const summary = parseTestSummary(coverageText);

const html = buildHtml(rows, summary, projectName, version);
await sendMail(recipient, html, projectName, summary, version);

// ── 테스트 요약 파싱 ───────────────────────────────────────────────────────
function parseTestSummary(text) {
  const summary = { suites: 0, suitesTotal: 0, tests: 0, testsTotal: 0, failed: 0, time: '0s', allPassed: true };

  const suitesMatch = text.match(/Test Suites:\s+(?:(\d+) failed,\s+)?(\d+) passed,\s+(\d+) total/);
  if (suitesMatch) {
    summary.suites = parseInt(suitesMatch[2]);
    summary.suitesTotal = parseInt(suitesMatch[3]);
    if (suitesMatch[1]) {
      summary.failed = parseInt(suitesMatch[1]);
      summary.allPassed = false;
    }
  }

  const testsMatch = text.match(/Tests:\s+(?:(\d+) failed,\s+)?(\d+) passed,\s+(\d+) total/);
  if (testsMatch) {
    summary.tests = parseInt(testsMatch[2]);
    summary.testsTotal = parseInt(testsMatch[3]);
    if (testsMatch[1]) summary.failed += parseInt(testsMatch[1]);
  }

  const timeMatch = text.match(/Time:\s+([\d.]+\s*s)/);
  if (timeMatch) summary.time = timeMatch[1];

  return summary;
}

// ── 커버리지 파싱 ─────────────────────────────────────────────────────────
function parseCoverage(text) {
  const rows = [];
  const lines = text.split('\n');
  let separatorCount = 0;

  for (const line of lines) {
    if (/^[-| ]+$/.test(line) && line.includes('|')) {
      separatorCount++;
      continue;
    }
    // 데이터는 2번째 구분선(헤더 뒤) ~ 3번째 구분선(테이블 끝) 사이
    if (separatorCount !== 2) continue;

    const parts = line.split('|').map(p => p.trim()).filter(Boolean);
    if (parts.length < 5) continue;

    const [file, stmts, branch, funcs, lines_] = parts;
    if (!stmts || isNaN(parseFloat(stmts))) continue;

    rows.push({
      file: file.trim(),
      stmts: parseFloat(stmts),
      branch: parseFloat(branch),
      funcs: parseFloat(funcs),
      lines: parseFloat(lines_),
      isTotal: file.trim().toLowerCase() === 'all files',
    });
  }

  return rows;
}

// ── HTML 빌드 ─────────────────────────────────────────────────────────────
function pctColor(val) {
  if (val >= 80) return '#16a34a';
  if (val >= 60) return '#d97706';
  return '#dc2626';
}

function pctBadge(val) {
  if (isNaN(val)) return `<span style="color:#6b7280">-</span>`;
  return `<span style="color:${pctColor(val)};font-weight:600">${val.toFixed(1)}%</span>`;
}

function buildHtml(rows, summary, projectName, version) {
  const total = rows.find(r => r.isTotal);
  const files = rows.filter(r => !r.isTotal);
  const now = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });

  const headerBg = summary.allPassed ? '#16a34a' : '#dc2626';
  const headerIcon = summary.allPassed ? '✅' : '❌';
  const headerTitle = summary.allPassed ? 'All Tests Passed' : 'Tests Failed';

  // ── 히어로 카드 ──
  const heroCards = `
    <div style="display:flex;gap:16px;margin-bottom:32px;flex-wrap:wrap">
      <div style="flex:2;min-width:160px;background:${summary.allPassed ? '#f0fdf4' : '#fef2f2'};border:1px solid ${summary.allPassed ? '#bbf7d0' : '#fecaca'};border-radius:12px;padding:20px;text-align:center">
        <div style="font-size:36px;font-weight:800;color:${summary.allPassed ? '#16a34a' : '#dc2626'}">${summary.tests}</div>
        <div style="font-size:13px;color:#6b7280;margin-top:4px">Tests Passed</div>
      </div>
      ${summary.failed > 0 ? `
      <div style="flex:2;min-width:160px;background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:20px;text-align:center">
        <div style="font-size:36px;font-weight:800;color:#dc2626">${summary.failed}</div>
        <div style="font-size:13px;color:#6b7280;margin-top:4px">Failed</div>
      </div>` : ''}
      <div style="flex:1;min-width:120px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:20px;text-align:center">
        <div style="font-size:28px;font-weight:700;color:#374151">${summary.suitesTotal}</div>
        <div style="font-size:13px;color:#6b7280;margin-top:4px">Test Suites</div>
      </div>
      <div style="flex:1;min-width:120px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:20px;text-align:center">
        <div style="font-size:28px;font-weight:700;color:#374151">${summary.time}</div>
        <div style="font-size:13px;color:#6b7280;margin-top:4px">Duration</div>
      </div>
    </div>`;

  // ── 커버리지 요약 (접이식 느낌으로 작게) ──
  const coverageSummary = total ? `
    <div style="margin-bottom:24px">
      <div style="font-size:13px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:10px">Coverage</div>
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        ${[['Stmts', total.stmts], ['Branch', total.branch], ['Funcs', total.funcs], ['Lines', total.lines]].map(([label, val]) => `
          <div style="flex:1;min-width:80px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:12px;text-align:center">
            <div style="font-size:18px;font-weight:700;color:${pctColor(val)}">${val.toFixed(1)}%</div>
            <div style="font-size:11px;color:#9ca3af;margin-top:2px">${label}</div>
          </div>`).join('')}
      </div>
    </div>` : '';

  // ── 파일별 상세 (서비스 파일만, 100% 제외) ──
  const notableFiles = files.filter(r => {
    const isService = r.file.endsWith('.service.ts') || r.file.endsWith('.guard.ts') || r.file.endsWith('.interceptor.ts');
    const hasLowCoverage = r.stmts < 80 || r.branch < 80 || r.funcs < 80;
    return isService && hasLowCoverage;
  });

  const fileSection = notableFiles.length > 0 ? `
    <div>
      <div style="font-size:13px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:10px">Coverage 주의 파일</div>
      <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;font-size:12px">
        <thead>
          <tr style="background:#f3f4f6">
            <th style="padding:8px 12px;text-align:left;color:#6b7280;border-bottom:1px solid #e5e7eb">File</th>
            <th style="padding:8px 12px;text-align:center;color:#6b7280;border-bottom:1px solid #e5e7eb">Stmts</th>
            <th style="padding:8px 12px;text-align:center;color:#6b7280;border-bottom:1px solid #e5e7eb">Branch</th>
            <th style="padding:8px 12px;text-align:center;color:#6b7280;border-bottom:1px solid #e5e7eb">Funcs</th>
            <th style="padding:8px 12px;text-align:center;color:#6b7280;border-bottom:1px solid #e5e7eb">Lines</th>
          </tr>
        </thead>
        <tbody>
          ${notableFiles.map((r, i) => `
          <tr style="background:${i % 2 === 0 ? '#fff' : '#f9fafb'}">
            <td style="padding:8px 12px;color:#374151;border-bottom:1px solid #e5e7eb;font-family:monospace">${r.file}</td>
            <td style="padding:8px 12px;text-align:center;border-bottom:1px solid #e5e7eb">${pctBadge(r.stmts)}</td>
            <td style="padding:8px 12px;text-align:center;border-bottom:1px solid #e5e7eb">${pctBadge(r.branch)}</td>
            <td style="padding:8px 12px;text-align:center;border-bottom:1px solid #e5e7eb">${pctBadge(r.funcs)}</td>
            <td style="padding:8px 12px;text-align:center;border-bottom:1px solid #e5e7eb">${pctBadge(r.lines)}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>` : '';

  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <div style="max-width:680px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1)">
    <div style="background:${headerBg};padding:28px 32px;color:#fff">
      <div style="font-size:22px;font-weight:700">${headerIcon} ${headerTitle}</div>
      <div style="margin-top:12px;display:flex;align-items:center;gap:8px;flex-wrap:wrap">
        <span style="font-size:13px;opacity:0.85">${projectName}</span>
        <span style="opacity:0.4">·</span>
        <span style="display:inline-flex;align-items:center;gap:5px;background:rgba(255,255,255,0.22);border:1px solid rgba(255,255,255,0.45);border-radius:6px;padding:3px 10px;font-size:13px;font-weight:700;letter-spacing:0.04em">
          🏷️ ${version}
        </span>
        <span style="opacity:0.4">·</span>
        <span style="font-size:12px;opacity:0.75">${now}</span>
      </div>
    </div>
    <div style="padding:32px">
      ${heroCards}
      ${coverageSummary}
      ${fileSection}
    </div>
  </div>
</body></html>`;
}

// ── 메일 발송 ─────────────────────────────────────────────────────────────
async function sendMail(to, html, projectName, summary, version) {
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: { user: MAIL_USER, pass: MAIL_PASS },
  });

  const now = new Date().toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul' });
  const status = summary?.allPassed ? '✅ Passed' : '❌ Failed';
  const testCount = summary ? `${summary.tests}/${summary.testsTotal}` : '';

  await transporter.sendMail({
    from: `"${projectName} CI" <${MAIL_USER}>`,
    to,
    subject: `[${projectName}] 🏷️ ${version} · ${status} · ${testCount} tests · ${now}`,
    html,
  });

  console.log(`✅ Coverage 리포트 발송 완료 → ${to}`);
}
