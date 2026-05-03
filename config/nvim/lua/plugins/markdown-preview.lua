-- 마크다운 (mermaid 다이어그램 포함) 을 브라우저에서 실시간 프리뷰.
-- :MarkdownPreview / :MarkdownPreviewStop / :MarkdownPreviewToggle 또는 <leader>mp.
--
-- 동작 원리: 플러그인이 로컬에 작은 node 서버를 띄우고 브라우저로 띄움.
-- nvim 버퍼 내용이 바뀔 때마다 websocket 으로 브라우저에 전송되어 실시간 갱신.
-- 터미널 종류와 무관하게 동작 (iTerm2 / 일반 터미널 모두 OK).
return {
  {
    "iamcco/markdown-preview.nvim",
    cmd = { "MarkdownPreview", "MarkdownPreviewStop", "MarkdownPreviewToggle" },
    ft = { "markdown" },
    -- 첫 로드 시 app/ 아래 node 모듈을 받아옴. 빌드 한 번 끝나면 이후 부팅엔 영향 없음.
    build = function()
      vim.fn["mkdp#util#install"]()
    end,
    config = function()
      vim.g.mkdp_auto_close = 0          -- 마크다운 버퍼 떠나도 프리뷰 창 유지
      vim.g.mkdp_theme = "dark"          -- 다크 테마
      vim.g.mkdp_filetypes = { "markdown" }
    end,
    keys = {
      { "<leader>mp", "<cmd>MarkdownPreviewToggle<CR>", desc = "Markdown preview toggle" },
    },
  },
}
