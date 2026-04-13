#!/bin/bash
# PreToolUse hook: reply 툴에 코드블록이 있으면 format: 'markdownv2' 강제
# 입력: stdin으로 JSON {"session_id": "...", "tool_name": "...", "tool_input": {...}}
# 출력: {"decision": "block", "reason": "..."} 또는 빈 출력 (허용)

INPUT=$(cat)

# reply 툴이 아니면 무시
TOOL_NAME=$(echo "$INPUT" | python3 -c "import sys, json; print(json.load(sys.stdin).get('tool_name', ''))" 2>/dev/null)
if [ "$TOOL_NAME" != "mcp__plugin_telegram_telegram__reply" ]; then
  exit 0
fi

# tool_input에서 text와 format 확인
python3 -c "
import sys, json

data = json.load(sys.stdin)
tool_input = data.get('tool_input', {})
text = tool_input.get('text', '')
fmt = tool_input.get('format', '')

# 코드블록이 포함되어 있는데 format이 markdownv2가 아닌 경우 차단
if '\`\`\`' in text and fmt != 'markdownv2':
    result = {
        'decision': 'block',
        'reason': 'Code block detected but format is not markdownv2. Re-call reply with format: \"markdownv2\". Code blocks require MarkdownV2 to render properly. Outside code blocks, escape special chars (. ! - ( ) + = { } | ~ > # _) with backslash.'
    }
    print(json.dumps(result))
" <<< "$INPUT"
