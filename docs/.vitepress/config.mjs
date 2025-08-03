import { defineConfig } from 'vitepress'

export default defineConfig({
  title: "CC教我编程",
  description: "记录编程学习经验，与社区分享成长",
  base: '/cc-teach-me-programming/',
  lang: 'zh-CN',
  
  themeConfig: {
    logo: '/logo.svg',
    nav: [
      { text: '首页', link: '/' },
      { text: '学习笔记', link: '/notes/' },
      { text: 'GitHub', link: 'https://github.com/frankie0736/cc-teach-me-programming' }
    ],

    sidebar: {
      '/notes/': [
        {
          text: '后端开发',
          collapsed: false,
          items: [
            { text: 'Better Auth 完全指南', link: '/notes/backend/blog-better-auth-guide' },
            { text: 'Drizzle ORM 完全指南', link: '/notes/backend/blog-drizzle-orm-guide' },
            { text: '如何保持Supabase数据库活跃状态', link: '/notes/backend/blog-supabase-keep-alive' }
          ]
        },
        {
          text: '前端开发',
          collapsed: false,
          items: []
        },
        {
          text: '工具使用',
          collapsed: false,
          items: []
        },
        {
          text: '编程思维',
          collapsed: false,
          items: []
        },
        {
          text: '项目实战',
          collapsed: false,
          items: []
        }
      ]
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/frankie0736/cc-teach-me-programming' }
    ],

    footer: {
      message: '欢迎通过Issue分享你的学习心得！',
      copyright: '210工作室 © 2025'
    },

    search: {
      provider: 'local',
      options: {
        locales: {
          root: {
            translations: {
              button: {
                buttonText: '搜索文档',
                buttonAriaLabel: '搜索文档'
              },
              modal: {
                noResultsText: '无法找到相关结果',
                resetButtonTitle: '清除查询条件',
                footer: {
                  selectText: '选择',
                  navigateText: '切换'
                }
              }
            }
          }
        }
      }
    }
  }
})