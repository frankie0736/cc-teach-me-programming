# Claude Code 项目规则

这是CC教我编程项目的规则文档，用于Claude Code记住项目约定。

## 项目概述

- 项目名称：CC教我编程
- GitHub仓库：https://github.com/frankie0736/cc-teach-me-programming
- 目的：记录编程学习经验，与社区分享

## 文件结构规则

### 1. 文章命名规范
- 所有学习经验文章使用 `blog-[主题]-[子主题].md` 格式
- 使用英文小写，单词间用连字符连接
- 例如：`blog-supabase-keep-alive.md`

### 2. 文章存放位置
- 所有文章存放在 `docs/notes/` 目录下的分类子目录中
- 分类目录：
  - `backend/` - 后端开发相关
  - `frontend/` - 前端开发相关
  - `tools/` - 工具使用技巧
  - `thinking/` - 编程思维和方法论
  - `projects/` - 项目实战经验

### 3. 新增文章流程
1. 在对应分类目录下创建文章文件
2. 更新 `docs/.vitepress/config.mjs` 的 sidebar 配置
3. 更新 `docs/notes/index.md` 的文章列表
4. README.md 现在只作为项目介绍，不再维护文章目录

## 文章格式规范

### 标准结构
```markdown
# 文章标题

## 问题背景
描述遇到的问题或学习需求

## 解决方案
详细的解决步骤

## 代码示例
```具体代码```

## 总结
学到的经验和注意事项

## 参考资源
- 相关链接
```

## Git提交规范

### 提交信息格式
- 新增文章：`添加文章：[文章主题]`
- 更新文章：`更新：[具体修改内容]`
- 更新目录：`更新README目录`

### 提交流程
1. 创建/修改文件
2. 更新README.md目录（如果是新文章）
3. git add
4. git commit（使用规范的提交信息）
5. git push

## 常用命令

```bash
# 查看仓库状态
git status

# 提交更改
git add .
git commit -m "提交信息"
git push

# 创建新文章
touch blog-[主题]-[子主题].md
```

## 注意事项

1. 所有文章必须是原创或注明来源
2. 代码示例要完整可运行
3. 敏感信息（密钥、密码等）绝不能提交
4. 保持文章简洁实用，注重实践经验
