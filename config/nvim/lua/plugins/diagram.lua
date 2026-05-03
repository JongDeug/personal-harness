-- 마크다운/노트 안의 ```mermaid 블록을 inline 이미지로 렌더링.
-- :DiagramShow / :DiagramHide / :DiagramToggle 로 제어.
--
-- 동작 조건:
--   * 터미널이 kitty graphics protocol 을 지원해야 함 (Kitty / WezTerm / Ghostty).
--     iTerm2 + tmux 환경에서는 inline 렌더가 정상 동작하지 않음.
--   * imagemagick (`magick`) + mermaid-cli (`mmdc`) 가 PATH 에 있어야 함.
--   * tmux 사용 시 ~/.tmux.conf 에 `set -g allow-passthrough on` 필요.
return {
  {
    "3rd/image.nvim",
    dependencies = { "leafo/magick" },
    ft = { "markdown", "mermaid", "norg", "typst" },
    opts = {
      backend = "kitty",
      processor = "magick_cli", -- luarocks magick rock 대신 imagemagick CLI 사용
      integrations = {
        markdown = {
          enabled = true,
          clear_in_insert_mode = false,
          download_remote_images = true,
          only_render_image_at_cursor = false,
          filetypes = { "markdown", "vimwiki", "quarto" },
        },
      },
      max_width = 100,
      max_height = 30,
      max_height_window_percentage = math.huge,
      max_width_window_percentage = math.huge,
      window_overlap_clear_enabled = true,
      window_overlap_clear_ft_ignore = { "cmp_menu", "cmp_docs", "" },
    },
  },
  {
    "3rd/diagram.nvim",
    dependencies = { "3rd/image.nvim" },
    ft = { "markdown", "mermaid" },
    -- opts 를 함수로 감싸 lazy.nvim 이 plugin 을 PATH 에 올린 뒤 평가하도록 함.
    -- 테이블 형태로 두면 spec 파싱 시점에 require 가 호출돼 모듈을 못 찾음.
    opts = function()
      return {
        integrations = {
          require("diagram.integrations.markdown"),
          require("diagram.integrations.neorg"),
        },
        renderer_options = {
          mermaid = {
            background = "transparent",
            theme = "dark",
            scale = 2,
          },
          plantuml = {
            charset = "utf-8",
          },
          d2 = {
            theme_id = 1,
          },
          gnuplot = {
            theme = "dark",
            size = "800,600",
          },
        },
      }
    end,
    keys = {
      { "<leader>md", "<cmd>DiagramToggle<CR>", desc = "Diagram toggle" },
    },
  },
}
