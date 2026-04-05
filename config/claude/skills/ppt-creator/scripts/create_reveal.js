#!/usr/bin/env node
/**
 * create_reveal.js
 * Slidev-style Markdown → Reveal.js 완전 독립형 HTML
 *
 * Usage:
 *   node create_reveal.js <slides.md> [output.html]
 *
 * 특징:
 * - 모든 JS/CSS 인라인 → 단일 .html 파일
 * - file:// 프로토콜에서 바로 열림 (서버 불필요)
 * - 코드 하이라이팅 (highlight.js + 라인 강조)
 * - 클릭 애니메이션 (v-clicks → fragments)
 * - 발표자 노트 (S 키)
 * - two-cols, section, cover, end, quote 레이아웃
 * - Tailwind 유틸리티 클래스 자동 변환
 */

const fs   = require('fs')
const path = require('path')

const revealBase = path.join(__dirname, '../slidev-workspace/node_modules/reveal.js')

function readAsset(relPath) {
  const fullPath = path.join(revealBase, relPath)
  if (!fs.existsSync(fullPath)) {
    console.warn(`[WARN] Asset not found: ${fullPath}`)
    return ''
  }
  return fs.readFileSync(fullPath, 'utf-8')
}

// ── Frontmatter 파서 ─────────────────────────────────────────────────────

function parseKV(text) {
  const meta = {}
  text.split('\n').forEach(line => {
    const m = line.match(/^([\w-]+)\s*:\s*(.*)$/)
    if (m) meta[m[1].trim()] = m[2].trim()
  })
  return meta
}

function isFrontmatter(text) {
  // 비어있지 않은 줄이 모두 key: value 형태면 frontmatter로 판단
  const lines = text.split('\n').filter(l => l.trim())
  return lines.length > 0 && lines.every(l => /^[\w-]+\s*:/.test(l.trim()))
}

function parseSlides(markdown) {
  // 전체를 \n---\n 로 분리
  // 구조: [empty] [global FM] [slide1 content] [slide FM?] [slide content] ...
  const parts = markdown.split(/\n---\n/)

  // 첫 두 파트: 빈 것 + global frontmatter
  let globalMeta = {}
  let startIdx = 0

  // 앞쪽에서 global FM 찾기
  for (let i = 0; i < Math.min(3, parts.length); i++) {
    if (isFrontmatter(parts[i].trim())) {
      globalMeta = parseKV(parts[i].trim())
      startIdx = i + 1
      break
    }
  }

  const slides = []
  let pendingMeta = {}

  for (let i = startIdx; i < parts.length; i++) {
    const part = parts[i].trim()
    if (!part) continue

    if (isFrontmatter(part)) {
      // 이 파트는 다음 슬라이드의 frontmatter
      pendingMeta = parseKV(part)
    } else {
      slides.push({ meta: pendingMeta, body: part })
      pendingMeta = {}
    }
  }

  return { globalMeta, slides }
}

// ── 인라인 마크다운 변환 ─────────────────────────────────────────────────

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function mdInline(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g,     '<em>$1</em>')
    .replace(/`([^`]+)`/g,     '<code>$1</code>')
}

// Tailwind/UnoCSS 유틸리티 → inline style 변환
function convertTailwindDiv(html) {
  return html.replace(/<div\s+class="([^"]+)"/g, (_, cls) => {
    const styles = []
    const parts  = cls.split(/\s+/)

    for (const p of parts) {
      if (p === 'absolute')             { styles.push('position:absolute') }
      else if (p === 'relative')        { styles.push('position:relative') }
      else if (/^bottom-(\d+)$/.test(p)) { styles.push(`bottom:${+p.split('-')[1]*4}px`) }
      else if (/^top-(\d+)$/.test(p))    { styles.push(`top:${+p.split('-')[1]*4}px`) }
      else if (/^left-(\d+)$/.test(p))   { styles.push(`left:${+p.split('-')[1]*4}px`) }
      else if (/^right-(\d+)$/.test(p))  { styles.push(`right:${+p.split('-')[1]*4}px`) }
      else if (/^p-(\d+)$/.test(p))      { styles.push(`padding:${+p.split('-')[1]*4}px`) }
      else if (/^px-(\d+)$/.test(p))     { styles.push(`padding-left:${+p.split('-')[1]*4}px;padding-right:${+p.split('-')[1]*4}px`) }
      else if (/^py-(\d+)$/.test(p))     { styles.push(`padding-top:${+p.split('-')[1]*4}px;padding-bottom:${+p.split('-')[1]*4}px`) }
      else if (/^mt-(\d+)$/.test(p))     { styles.push(`margin-top:${+p.split('-')[1]*4}px`) }
      else if (/^mb-(\d+)$/.test(p))     { styles.push(`margin-bottom:${+p.split('-')[1]*4}px`) }
      else if (/^text-(\d+)xl$/.test(p)) { const n = +p.match(/^text-(\d+)/)[1]; styles.push(`font-size:${n*1.25}em`) }
      else if (p === 'text-sm')           { styles.push('font-size:0.875em') }
      else if (p === 'text-xs')           { styles.push('font-size:0.75em') }
      else if (p === 'text-lg')           { styles.push('font-size:1.125em') }
      else if (p === 'text-center')       { styles.push('text-align:center') }
      else if (p === 'text-right')        { styles.push('text-align:right') }
      else if (p === 'font-bold')         { styles.push('font-weight:bold') }
      else if (p === 'rounded' || p === 'rounded-lg') { styles.push('border-radius:8px') }
      else if (p === 'rounded-xl')        { styles.push('border-radius:12px') }
      else if (p === 'w-full')            { styles.push('width:100%') }
      else if (/^w-(\d+)$/.test(p))       { styles.push(`width:${+p.split('-')[1]*4}px`) }
      else if (/^bg-([a-z]+-\d+)$/.test(p)) {
        const colorMap = {
          'gray-800': '#1f2937', 'gray-700': '#374151', 'gray-900': '#111827',
          'blue-900': '#1e3a8a', 'blue-800': '#1e40af', 'blue-700': '#1d4ed8',
          'slate-800': '#1e293b', 'slate-700': '#334155',
        }
        const color = colorMap[p.slice(3)] || null
        if (color) styles.push(`background:${color}`)
      }
      else if (p === 'text-white')        { styles.push('color:#ffffff') }
      else if (/^text-([a-z]+-\d+)$/.test(p)) {
        const colorMap = {
          'gray-400': '#9ca3af', 'gray-300': '#d1d5db',
          'blue-300': '#93c5fd', 'blue-400': '#60a5fa',
        }
        const color = colorMap[p.slice(5)] || null
        if (color) styles.push(`color:${color}`)
      }
    }

    const styleStr = styles.length ? ` style="${styles.join(';')}"` : ''
    return `<div${styleStr}`
  })
}

// ── Markdown 블록 → HTML ─────────────────────────────────────────────────

function mdToHtml(md) {
  // v-click/v-clicks 태그 제거 (fragment는 불릿에서 처리)
  md = md.replace(/<\/?v-clicks?>/g, '')

  // Tailwind div 변환
  md = convertTailwindDiv(md)

  const lines  = md.split('\n')
  const result = []
  let inCode   = false
  let codeLang = ''
  let codeHighlight = ''
  let codeLines     = []
  let listItems     = []
  let listType      = ''
  let tableRows     = []
  let inTable       = false

  function flushList() {
    if (!listItems.length) return
    const tag = listType || 'ul'
    result.push(`<${tag}>${listItems.join('')}</${tag}>`)
    listItems = []
    listType  = ''
  }

  function flushTable() {
    if (!tableRows.length) return
    // row[0] = header, row[1] = separator, rest = data
    const [headerRow, , ...dataRows] = tableRows
    const ths = headerRow.split('|').filter(Boolean)
      .map(c => `<th>${mdInline(c.trim())}</th>`).join('')
    const trs = dataRows.map(row =>
      '<tr>' + row.split('|').filter(Boolean)
        .map(c => `<td>${mdInline(c.trim())}</td>`).join('') + '</tr>'
    ).join('')
    result.push(
      `<table class="r-table"><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table>`
    )
    tableRows = []
    inTable   = false
  }

  function flushCode() {
    const content = escapeHtml(codeLines.join('\n'))
    const langAttr = codeLang ? ` class="language-${codeLang}"` : ''
    const hlAttr   = codeHighlight ? ` data-line-numbers="${codeHighlight}"` : ''
    result.push(`<pre><code${langAttr}${hlAttr}>${content}</code></pre>`)
    codeLines      = []
    codeLang       = ''
    codeHighlight  = ''
    inCode         = false
  }

  for (const line of lines) {
    // ── 코드 블록 ──
    if (line.startsWith('```')) {
      if (inCode) { flushCode(); continue }
      flushList(); flushTable()
      inCode = true
      const raw = line.slice(3).trim()
      // {1,3-5} or {1|3|5} 파싱
      const hlMatch = raw.match(/\{([0-9,\-|]+)\}/)
      if (hlMatch) {
        codeHighlight = hlMatch[1]           // Reveal.js data-line-numbers
        codeLang      = raw.replace(/\{[^}]+\}/, '').trim()
      } else {
        codeLang = raw
      }
      continue
    }
    if (inCode) { codeLines.push(line); continue }

    // ── 테이블 ──
    if (/^\s*\|/.test(line)) {
      flushList()
      inTable = true
      tableRows.push(line.trim())
      continue
    }
    if (inTable && !/^\s*\|/.test(line)) flushTable()

    // ── 제목 ──
    const hMatch = line.match(/^(#{1,4})\s+(.+)/)
    if (hMatch) {
      flushList()
      const lvl = hMatch[1].length
      result.push(`<h${lvl}>${mdInline(hMatch[2])}</h${lvl}>`)
      continue
    }

    // ── 불릿 (fragment 적용) ──
    const ulMatch = line.match(/^[-*]\s+(.+)/)
    if (ulMatch) {
      if (!listType) listType = 'ul'
      listItems.push(`<li><span class="fragment">${mdInline(ulMatch[1])}</span></li>`)
      continue
    }
    const olMatch = line.match(/^\d+\.\s+(.+)/)
    if (olMatch) {
      if (!listType) listType = 'ol'
      listItems.push(`<li>${mdInline(olMatch[1])}</li>`)
      continue
    }

    // ── 빈 줄 ──
    if (!line.trim()) {
      flushList()
      continue
    }

    // ── 이미 HTML 태그인 줄 (div, kbd 등) ──
    if (/^\s*</.test(line)) {
      flushList()
      result.push(line)
      continue
    }

    // ── 일반 단락 ──
    flushList()
    result.push(`<p>${mdInline(line)}</p>`)
  }

  flushList()
  if (inCode) flushCode()
  flushTable()

  return result.join('\n')
}

// ── 슬라이드 빌더 ────────────────────────────────────────────────────────

function buildSlide(slide) {
  const { meta, body } = slide

  // 발표자 노트 추출
  const noteMatch = body.match(/<!--([\s\S]*?)-->/)
  const notes     = noteMatch ? noteMatch[1].trim() : ''
  const cleanBody = body.replace(/<!--[\s\S]*?-->/g, '').trim()

  // ::right:: 분리 (two-cols)
  const layout = meta.layout || ''
  let innerHTML = ''

  if (layout === 'two-cols') {
    // ── 제목 분리 ──
    const titleMatch = cleanBody.match(/^(#{1,3}[^\n]+)\n/)
    const titleHtml  = titleMatch
      ? `<h2 class="cols-title">${mdInline(titleMatch[1].replace(/^#+\s*/, ''))}</h2>`
      : ''
    const bodyNoTitle = titleMatch
      ? cleanBody.slice(titleMatch[0].length)
      : cleanBody

    // ── ::left:: / ::right:: 분리 ──
    const rightRe  = /\n?::right::\n?/
    const parts    = bodyNoTitle.split(rightRe)
    // ::left:: 마커를 어디에 있든 모두 제거
    const leftRaw  = parts[0].replace(/::left::/g, '').trim()
    const rightRaw = (parts[1] || '').replace(/::right::/g, '').trim()

    // 팁 박스 등 absolute 요소는 컬럼 밖으로 분리
    const absoluteRe   = /(<div[^>]*position:absolute[^>]*>[\s\S]*?<\/div>)/g
    const absBoxes     = []
    const rightClean   = rightRaw.replace(absoluteRe, (m) => { absBoxes.push(m); return '' }).trim()
    const absHtml      = absBoxes.join('\n')

    innerHTML = `
      ${titleHtml}
      <div class="two-cols">
        <div class="col-left">${mdToHtml(leftRaw)}</div>
        <div class="col-right">${mdToHtml(rightClean)}</div>
      </div>
      ${absHtml ? `<div class="tip-box">${absHtml}</div>` : ''}`

  } else if (layout === 'section') {
    innerHTML = `<div class="section-wrap">${mdToHtml(cleanBody)}</div>`

  } else if (layout === 'cover') {
    innerHTML = `<div class="cover-wrap">${mdToHtml(cleanBody)}</div>`

  } else if (layout === 'end') {
    innerHTML = `<div class="end-wrap">${mdToHtml(cleanBody)}</div>`

  } else if (layout === 'quote') {
    innerHTML = `<blockquote class="big-quote">${mdToHtml(cleanBody)}</blockquote>`

  } else {
    // default / cover 자동 감지 (첫 슬라이드 등)
    innerHTML = mdToHtml(cleanBody)
  }

  const notesHtml = notes
    ? `<aside class="notes">${notes.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</aside>`
    : ''

  const dataBg = meta.background ? ` data-background-image="${meta.background}"` : ''
  return `<section${dataBg}>${innerHTML}${notesHtml}</section>`
}

// ── 커스텀 CSS ───────────────────────────────────────────────────────────

function getCustomCss(isDark) {
  const accent  = isDark ? '#7dd3fc' : '#2563eb'
  const tip_bg  = isDark ? '#1e293b' : '#eff6ff'
  const tip_fg  = isDark ? '#cbd5e1' : '#1e3a8a'
  const tbl_hd  = isDark ? '#334155' : '#1e40af'
  const tbl_ev  = isDark ? '#1e293b' : '#f0f4ff'
  const tbl_brd = isDark ? '#334155' : '#e2e8f0'
  const code_bg = isDark ? '#0d1117' : '#f6f8fa'

  return `
/* ── 기본 타이포그래피 ── */
.reveal                       { font-size: 36px; }
.reveal h1                    { font-size: 1.9em; line-height: 1.15; }
.reveal h2                    { font-size: 1.5em; line-height: 1.2; }
.reveal h3                    { font-size: 1.05em; color: ${accent}; margin: 0.6em 0 0.3em; }
.reveal h4                    { font-size: 0.9em; color: ${accent}; margin: 0.4em 0 0.2em; }
.reveal p                     { font-size: 0.75em; line-height: 1.65; margin: 0.3em 0; }
.reveal li                    { font-size: 0.72em; line-height: 1.7; }
.reveal strong                { color: ${accent}; }
.reveal code                  { font-size: 0.72em; padding: 1px 5px; border-radius: 4px; }

/* ── 코드 블록 ── */
.reveal pre                   { width: 100%; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,.35); margin: 0.5em 0; }
.reveal pre code              { font-size: 0.62em; line-height: 1.55; max-height: 380px;
                                background: ${code_bg}; border-radius: 8px; }

/* ── 테이블 ── */
.r-table                      { border-collapse: collapse; width: 100%; font-size: 0.65em; margin: 0.6em 0; }
.r-table th                   { background: ${tbl_hd}; color: #fff; padding: 8px 14px; text-align: left; }
.r-table td                   { padding: 7px 14px; border-bottom: 1px solid ${tbl_brd}; }
.r-table tr:nth-child(even) td{ background: ${tbl_ev}; }

/* ── two-cols 레이아웃 ── */
.cols-title                   { margin-bottom: 0.4em !important; font-size: 1.2em !important; }
.two-cols                     { display: grid; grid-template-columns: 1fr 1fr; gap: 1.8em;
                                align-items: start; }
.col-left, .col-right         { min-width: 0; }
.col-left h3,
.col-right h3                 { font-size: 0.95em !important; margin-top: 0; }
.col-left li,
.col-right li                 { font-size: 0.68em; line-height: 1.65; }

/* ── 섹션 슬라이드 ── */
.section-wrap                 { display: flex; flex-direction: column;
                                align-items: center; justify-content: center;
                                height: 80%; text-align: center; }
.section-wrap h1,
.section-wrap h2              { font-size: 2.2em !important; }

/* ── 표지 ── */
.cover-wrap                   { display: flex; flex-direction: column;
                                justify-content: center; height: 85%; }
.cover-wrap h1                { font-size: 2em !important; }

/* ── 마무리 ── */
.end-wrap                     { text-align: center; display: flex;
                                flex-direction: column; align-items: center;
                                justify-content: center; height: 85%; }
.end-wrap h1                  { font-size: 2.5em !important; }

/* ── 인용구 ── */
.big-quote                    { font-size: 1.1em; border-left: 4px solid ${accent};
                                padding-left: 1em; margin: 0.5em 0; font-style: italic; }

/* ── 팁 박스 (two-cols 하단) ── */
.tip-box                      { margin-top: 0.6em; }
.tip-box div, .tip-box p      { font-size: 0.6em !important; line-height: 1.5;
                                border-radius: 8px; padding: 10px 16px !important;
                                background: #1e293b; color: #cbd5e1; }
[style*="position:absolute"]  { font-size: 0.62em !important; line-height: 1.5;
                                border-radius: 8px; padding: 10px 16px !important; }

/* ── fragment ── */
.fragment                     { display: inline; }

/* ── 슬라이드 번호 ── */
.reveal .slide-number         { font-size: 0.6em; background: rgba(0,0,0,.3); border-radius: 4px; }
`
}

// ── HTML 조립 ─────────────────────────────────────────────────────────────

function generateHtml(globalMeta, slides) {
  const title      = globalMeta.title || 'Presentation'
  const colorSchema = globalMeta.colorSchema || 'dark'
  const isDark     = colorSchema !== 'light'
  const transition = globalMeta.transition || 'slide'

  const revealJs  = readAsset('dist/reveal.js')
  const revealCss = readAsset('dist/reveal.css')
  const themeCss  = readAsset(isDark ? 'dist/theme/night.css' : 'dist/theme/white.css')
  const hlCss     = readAsset('dist/plugin/highlight/monokai.css')
  const hlJs      = readAsset('dist/plugin/highlight.js')
  const notesJs   = readAsset('dist/plugin/notes.js')

  const slidesHtml = slides.map(buildSlide).join('\n')

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <style>${revealCss}</style>
  <style>${themeCss}</style>
  <style>${hlCss}</style>
  <style>${getCustomCss(isDark)}</style>
</head>
<body>
<div class="reveal">
  <div class="slides">
${slidesHtml}
  </div>
</div>
<script>${revealJs}</script>
<script>${hlJs}</script>
<script>${notesJs}</script>
<script>
Reveal.initialize({
  hash: true,
  slideNumber: 'c/t',
  transition: '${transition}',
  center: false,
  plugins: [ RevealHighlight, RevealNotes ],
});
</script>
</body>
</html>`
}

// ── Entry ─────────────────────────────────────────────────────────────────

const [,, inputArg, outputArg] = process.argv
if (!inputArg) {
  console.error('Usage: node create_reveal.js <slides.md> [output.html]')
  process.exit(1)
}

const inputPath  = path.resolve(inputArg)
const outputPath = outputArg
  ? path.resolve(outputArg)
  : inputPath.replace(/\.md$/, '.html')

const markdown = fs.readFileSync(inputPath, 'utf-8')
const { globalMeta, slides } = parseSlides(markdown)
const html = generateHtml(globalMeta, slides)

fs.writeFileSync(outputPath, html, 'utf-8')
const kb = (fs.statSync(outputPath).size / 1024).toFixed(0)
console.log(`[OK] ${outputPath}  (${kb} KB, ${slides.length} slides)`)
console.log(`[OK] file:// 직접 열기 가능 ✅`)
