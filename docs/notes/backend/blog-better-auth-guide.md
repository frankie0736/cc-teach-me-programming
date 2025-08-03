# Better Auth 完全指南：构建企业级认证系统

## 前言

在构建现代 Web 应用时，认证系统是最重要也是最复杂的部分之一。Better Auth 作为一个 TypeScript 优先的认证框架，提供了一套完整、类型安全、易扩展的解决方案。本文将深入探讨 Better Auth 的核心概念、实现方案，以及如何构建一个功能完备的企业内部管理系统。

## Better Auth 是什么？

Better Auth 是一个**框架无关的 TypeScript 认证和授权框架**。它的设计理念是：
- 🔒 **类型安全**：端到端的 TypeScript 支持
- 🚀 **高性能**：轻量级设计，最小运行时开销
- 🔧 **易扩展**：强大的插件系统
- 📦 **功能完备**：开箱即用的认证功能
- 🎯 **框架无关**：支持 Next.js、Nuxt、Express 等

## 核心工作原理

### 1. 架构设计

Better Auth 采用了模块化的架构设计：

```
┌─────────────────────────────────────────────────┐
│                   应用层                          │
├─────────────────────────────────────────────────┤
│               Better Auth Core                   │
│  ┌─────────┐  ┌─────────┐  ┌──────────────┐   │
│  │ Session │  │  User   │  │   Account    │   │
│  │ Manager │  │ Manager │  │   Linking    │   │
│  └─────────┘  └─────────┘  └──────────────┘   │
├─────────────────────────────────────────────────┤
│                  插件系统                         │
│  ┌─────────┐  ┌─────────┐  ┌──────────────┐   │
│  │  Magic  │  │  OAuth  │  │     RBAC     │   │
│  │  Link   │  │ Plugins │  │   (Admin)    │   │
│  └─────────┘  └─────────┘  └──────────────┘   │
├─────────────────────────────────────────────────┤
│               数据库适配器                        │
│         (Drizzle ORM / Prisma / etc)            │
└─────────────────────────────────────────────────┘
```

### 2. 认证流程

Better Auth 的认证流程设计非常灵活：

```typescript
// 1. 初始化 Better Auth
import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg"
  }),
  
  // 启用邮箱密码认证
  emailAndPassword: {
    enabled: true
  },
  
  // 配置社交登录
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }
  }
})
```

## 多种登录方式实现

### 1. Google 一键登录

Better Auth 内置了对主流社交平台的支持。实现 Google 登录非常简单：

**服务端配置：**
```typescript
// auth.ts
export const auth = betterAuth({
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      // 可选：请求额外权限
      scope: ["email", "profile", "openid"]
    }
  }
})
```

**客户端实现：**
```typescript
// auth-client.ts
import { createAuthClient } from "better-auth/client"

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL
})

// 登录组件
export function GoogleLoginButton() {
  const handleGoogleLogin = async () => {
    await authClient.signIn.social({
      provider: "google",
      callbackURL: "/dashboard",
      // 新用户跳转到欢迎页
      newUserCallbackURL: "/welcome",
      // 错误处理
      errorCallbackURL: "/login?error=google"
    })
  }
  
  return (
    <button onClick={handleGoogleLogin}>
      使用 Google 账号登录
    </button>
  )
}
```

### 2. 邮箱密码登录

传统的邮箱密码登录仍然是企业系统的主流选择：

**服务端配置：**
```typescript
export const auth = betterAuth({
  emailAndPassword: {
    enabled: true,
    // 自定义密码要求
    minPasswordLength: 8,
    maxPasswordLength: 128,
    // 密码加密配置
    password: {
      hash: async (password) => {
        // 使用 bcrypt 或其他加密方法
        return await bcrypt.hash(password, 10)
      },
      verify: async (password, hash) => {
        return await bcrypt.compare(password, hash)
      }
    }
  }
})
```

**客户端实现：**
```typescript
// 注册
const signUp = async (email: string, password: string, name: string) => {
  const { data, error } = await authClient.signUp.email({
    email,
    password,
    name,
    // 注册后自动登录
    callbackURL: "/dashboard"
  })
  
  if (error) {
    console.error("注册失败:", error)
  }
  return data
}

// 登录
const signIn = async (email: string, password: string) => {
  const { data, error } = await authClient.signIn.email({
    email,
    password,
    rememberMe: true // 记住登录状态
  })
  
  return data
}
```

### 3. Magic Link 无密码登录

Magic Link 是一种安全便捷的无密码登录方式：

**服务端配置：**
```typescript
import { magicLink } from "better-auth/plugins"

export const auth = betterAuth({
  plugins: [
    magicLink({
      sendMagicLink: async ({ email, token, url }, request) => {
        // 使用你的邮件服务发送魔法链接
        await sendEmail({
          to: email,
          subject: "登录链接",
          html: `
            <h1>点击下方链接登录</h1>
            <a href="${url}">登录</a>
            <p>链接将在 10 分钟后失效</p>
            <p>验证码：${token}</p>
          `
        })
      },
      // 可选配置
      expiresIn: 60 * 10, // 10 分钟有效期
      disableSignUp: false, // 允许新用户通过 Magic Link 注册
    })
  ]
})
```

**客户端实现：**
```typescript
import { magicLinkClient } from "better-auth/client/plugins"

export const authClient = createAuthClient({
  plugins: [magicLinkClient()]
})

// 发送 Magic Link
const sendMagicLink = async (email: string) => {
  const { data, error } = await authClient.signIn.magicLink({
    email,
    callbackURL: "/dashboard",
    newUserCallbackURL: "/onboarding"
  })
  
  if (data) {
    alert("登录链接已发送到您的邮箱")
  }
}
```

### 4. 账户关联（统一用户身份）

Better Auth 的账户关联功能允许用户使用多种方式登录同一个账户：

**启用账户关联：**
```typescript
export const auth = betterAuth({
  account: {
    accountLinking: {
      enabled: true,
      // 信任的提供商（自动关联相同邮箱）
      trustedProviders: ["google", "github"],
      // 允许不同邮箱关联
      allowDifferentEmails: true
    }
  }
})
```

**关联流程实现：**
```typescript
// 在用户设置页面
export function AccountLinking() {
  const { data: session } = useSession()
  
  const linkGoogleAccount = async () => {
    await authClient.linkSocial({
      provider: "google",
      callbackURL: "/settings/accounts"
    })
  }
  
  const unlinkAccount = async (providerId: string, accountId: string) => {
    await authClient.unlinkAccount({
      providerId,
      accountId
    })
  }
  
  return (
    <div>
      <h2>关联账户</h2>
      {session?.user?.accounts?.map(account => (
        <div key={account.id}>
          <span>{account.provider}</span>
          <button onClick={() => unlinkAccount(account.provider, account.id)}>
            解除关联
          </button>
        </div>
      ))}
      <button onClick={linkGoogleAccount}>
        关联 Google 账户
      </button>
    </div>
  )
}
```

## 角色权限控制（RBAC）

Better Auth 通过 Admin 和 Access Control 插件提供了强大的角色权限管理功能：

### 1. 基础权限系统设计

**定义权限声明（Statement）：**
```typescript
// permissions.ts
import { createAccessControl } from "better-auth/plugins/access"

// 定义资源和操作
export const statement = {
  // 用户管理
  user: ["create", "read", "update", "delete", "ban"],
  // 部门管理
  department: ["create", "read", "update", "delete", "assign"],
  // 项目管理
  project: ["create", "read", "update", "delete", "share"],
  // 报表权限
  report: ["view", "export", "create"],
  // 系统设置
  system: ["config", "backup", "restore"]
} as const

// 创建访问控制器
export const ac = createAccessControl(statement)
```

**定义角色：**
```typescript
// 普通员工
export const staffRole = ac.newRole({
  user: ["read"],
  project: ["read", "create"],
  report: ["view"]
})

// 部门经理
export const managerRole = ac.newRole({
  user: ["read", "update"],
  department: ["read", "assign"],
  project: ["create", "read", "update", "share"],
  report: ["view", "export", "create"]
})

// 系统管理员
export const adminRole = ac.newRole({
  user: ["create", "read", "update", "delete", "ban"],
  department: ["create", "read", "update", "delete", "assign"],
  project: ["create", "read", "update", "delete", "share"],
  report: ["view", "export", "create"],
  system: ["config", "backup", "restore"]
})
```

### 2. 集成到 Better Auth

```typescript
// auth.ts
import { betterAuth } from "better-auth"
import { admin } from "better-auth/plugins"
import { ac, staffRole, managerRole, adminRole } from "./permissions"

export const auth = betterAuth({
  plugins: [
    admin({
      ac,
      roles: {
        staff: staffRole,
        manager: managerRole,
        admin: adminRole
      },
      // 默认角色
      defaultRole: "staff"
    })
  ]
})
```

### 3. 权限检查实现

**服务端权限检查：**
```typescript
// api/projects/route.ts
import { auth } from "@/lib/auth"

export async function POST(request: Request) {
  const session = await auth.api.getSession({
    headers: request.headers
  })
  
  if (!session) {
    return new Response("Unauthorized", { status: 401 })
  }
  
  // 检查用户是否有创建项目的权限
  const hasPermission = await auth.api.hasPermission({
    body: {
      permission: {
        project: ["create"]
      }
    },
    headers: request.headers
  })
  
  if (!hasPermission) {
    return new Response("Forbidden", { status: 403 })
  }
  
  // 创建项目...
}
```

**客户端权限检查：**
```typescript
// hooks/usePermission.ts
import { adminClient } from "better-auth/client/plugins"

export const authClient = createAuthClient({
  plugins: [
    adminClient({
      ac,
      roles: { staff: staffRole, manager: managerRole, admin: adminRole }
    })
  ]
})

// React Hook
export function usePermission() {
  const { data: session } = useSession()
  
  const hasPermission = useCallback((permissions: any) => {
    if (!session) return false
    return authClient.admin.hasPermission({ permissions })
  }, [session])
  
  const checkRole = useCallback((role: string) => {
    return session?.user?.role === role
  }, [session])
  
  return { hasPermission, checkRole, role: session?.user?.role }
}

// 使用示例
function ProjectList() {
  const { hasPermission } = usePermission()
  
  return (
    <div>
      {hasPermission({ project: ["create"] }) && (
        <button>创建项目</button>
      )}
    </div>
  )
}
```

## 企业内部管理系统设计

基于 Better Auth，我们可以构建一个功能完备的企业内部管理系统。以下是完整的设计方案：

### 1. 数据库模型设计

```typescript
// schema.ts
import { pgTable, text, timestamp, uuid, boolean, integer, jsonb } from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"

// Better Auth 基础表（用户、会话、账户）
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("emailVerified").notNull().default(false),
  name: text("name").notNull(),
  image: text("image"),
  role: text("role").notNull().default("staff"), // staff, manager, admin
  departmentId: uuid("department_id").references(() => department.id),
  position: text("position"), // 职位
  phone: text("phone"),
  isActive: boolean("is_active").default(true),
  joinedAt: timestamp("joined_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  metadata: jsonb("metadata"), // 扩展字段
})

// 部门表
export const department = pgTable("department", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  code: text("code").unique(), // 部门编码
  parentId: uuid("parent_id").references(() => department.id),
  managerId: text("manager_id").references(() => user.id),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
})

// 模块权限表
export const module = pgTable("module", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  code: text("code").unique().notNull(), // 模块编码，如 'crm', 'finance'
  description: text("description"),
  icon: text("icon"),
  path: text("path"), // 前端路由
  parentId: uuid("parent_id").references(() => module.id),
  order: integer("order").default(0),
  isActive: boolean("is_active").default(true),
})

// 角色模块权限关联表
export const roleModulePermission = pgTable("role_module_permission", {
  id: uuid("id").primaryKey().defaultRandom(),
  role: text("role").notNull(), // 角色名
  moduleId: uuid("module_id").references(() => module.id),
  permissions: jsonb("permissions"), // ["read", "write", "delete"]
  createdAt: timestamp("created_at").defaultNow(),
})

// 审计日志表
export const auditLog = pgTable("audit_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").references(() => user.id),
  action: text("action").notNull(), // 'login', 'create', 'update', 'delete'
  resource: text("resource").notNull(), // 'user', 'department', 'module'
  resourceId: text("resource_id"),
  changes: jsonb("changes"), // 变更详情
  ip: text("ip"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
})
```

### 2. 认证配置增强

```typescript
// auth.ts
import { betterAuth } from "better-auth"
import { admin, twoFactor, magicLink, rateLimit } from "better-auth/plugins"
import { drizzleAdapter } from "better-auth/adapters/drizzle"

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg"
  }),
  
  // 基础配置
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
  },
  
  // 社交登录（企业微信、钉钉等）
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      // 限制企业域名
      mapProfileToUser: (profile) => {
        if (!profile.email?.endsWith("@company.com")) {
          throw new Error("仅允许公司邮箱登录")
        }
        return {
          email: profile.email,
          name: profile.name,
          image: profile.picture,
        }
      }
    }
  },
  
  // 插件配置
  plugins: [
    // 管理员功能
    admin({
      ac,
      roles: {
        staff: staffRole,
        manager: managerRole,
        admin: adminRole,
      },
      defaultRole: "staff"
    }),
    
    // 双因素认证
    twoFactor({
      issuer: "Company OA",
      // 强制管理员启用 2FA
      requireTwoFactor: async (user) => {
        return user.role === "admin"
      }
    }),
    
    // Magic Link
    magicLink({
      sendMagicLink: async ({ email, url, token }) => {
        // 发送邮件
      },
      expiresIn: 60 * 15, // 15分钟
    }),
    
    // 速率限制
    rateLimit({
      window: 60, // 60秒
      max: 5, // 最多5次
      storage: "memory", // 或使用 Redis
    })
  ],
  
  // 会话配置
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7天
    updateAge: 60 * 60 * 24, // 每天更新
    cookieName: "company-oa-session",
  },
  
  // Hooks
  hooks: {
    after: [
      {
        matcher: () => true,
        handler: async (ctx) => {
          // 记录审计日志
          if (ctx.request && ctx.body) {
            await db.insert(auditLog).values({
              userId: ctx.context.session?.userId,
              action: ctx.request.method,
              resource: ctx.request.url,
              ip: ctx.request.headers.get("x-forwarded-for"),
              userAgent: ctx.request.headers.get("user-agent"),
            })
          }
        }
      }
    ],
    
    user: {
      create: {
        before: async (user) => {
          // 自动分配部门
          if (!user.departmentId && user.email) {
            const dept = await guessUserDepartment(user.email)
            user.departmentId = dept?.id
          }
          return user
        }
      }
    }
  }
})
```

### 3. 权限管理系统实现

```typescript
// permissions/index.ts
import { createAccessControl } from "better-auth/plugins/access"

// 定义所有权限点
export const permissions = {
  // 用户管理
  user: {
    view: "查看用户",
    create: "创建用户",
    update: "更新用户",
    delete: "删除用户",
    ban: "禁用用户",
    resetPassword: "重置密码",
  },
  
  // 部门管理
  department: {
    view: "查看部门",
    create: "创建部门",
    update: "更新部门",
    delete: "删除部门",
    assign: "分配成员",
  },
  
  // 模块管理
  module: {
    crm: {
      customer: ["view", "create", "update", "delete"],
      order: ["view", "create", "update", "delete", "approve"],
    },
    finance: {
      invoice: ["view", "create", "update", "delete", "approve"],
      payment: ["view", "create", "update", "approve"],
      report: ["view", "export"],
    },
    inventory: {
      product: ["view", "create", "update", "delete"],
      stock: ["view", "update", "transfer"],
      purchase: ["view", "create", "update", "approve"],
    }
  }
}

// 创建访问控制
export const ac = createAccessControl({
  user: Object.keys(permissions.user),
  department: Object.keys(permissions.department),
  customer: permissions.module.crm.customer,
  order: permissions.module.crm.order,
  invoice: permissions.module.finance.invoice,
  payment: permissions.module.finance.payment,
  product: permissions.module.inventory.product,
  stock: permissions.module.inventory.stock,
} as const)

// 定义角色权限矩阵
export const rolePermissions = {
  // 普通员工
  staff: {
    user: ["view"],
    department: ["view"],
    customer: ["view", "create", "update"],
    order: ["view", "create"],
    product: ["view"],
  },
  
  // 部门经理
  manager: {
    ...rolePermissions.staff,
    user: ["view", "update"],
    department: ["view", "assign"],
    order: ["view", "create", "update", "approve"],
    invoice: ["view", "create"],
    payment: ["view"],
    stock: ["view", "update"],
  },
  
  // 管理员（所有权限）
  admin: Object.keys(permissions).reduce((acc, key) => {
    acc[key] = "all"
    return acc
  }, {})
}
```

### 4. 前端权限控制组件

```typescript
// components/PermissionGuard.tsx
import { usePermission } from "@/hooks/usePermission"
import { ReactNode } from "react"

interface PermissionGuardProps {
  resource: string
  action: string | string[]
  fallback?: ReactNode
  children: ReactNode
}

export function PermissionGuard({ 
  resource, 
  action, 
  fallback = null, 
  children 
}: PermissionGuardProps) {
  const { hasPermission } = usePermission()
  
  const actions = Array.isArray(action) ? action : [action]
  const canAccess = hasPermission({ [resource]: actions })
  
  return canAccess ? <>{children}</> : <>{fallback}</>
}

// 使用示例
<PermissionGuard resource="user" action="create">
  <button>创建用户</button>
</PermissionGuard>

// 路由保护
export function ProtectedRoute({ 
  resource, 
  action, 
  children 
}: { 
  resource: string
  action: string
  children: ReactNode 
}) {
  const { hasPermission } = usePermission()
  const router = useRouter()
  
  useEffect(() => {
    if (!hasPermission({ [resource]: [action] })) {
      router.push("/403")
    }
  }, [])
  
  return hasPermission({ [resource]: [action] }) ? children : null
}
```

### 5. API 权限中间件

```typescript
// middleware/auth.ts
import { auth } from "@/lib/auth"
import { NextRequest, NextResponse } from "next/server"

export function withAuth(
  handler: (req: NextRequest, session: any) => Promise<NextResponse>,
  options?: {
    resource?: string
    action?: string
  }
) {
  return async (req: NextRequest) => {
    // 获取会话
    const session = await auth.api.getSession({
      headers: req.headers
    })
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    
    // 检查权限
    if (options?.resource && options?.action) {
      const hasPermission = await auth.api.hasPermission({
        body: {
          permission: {
            [options.resource]: [options.action]
          }
        },
        headers: req.headers
      })
      
      if (!hasPermission) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
    }
    
    return handler(req, session)
  }
}

// 使用示例
export const POST = withAuth(
  async (req, session) => {
    // 创建用户逻辑
  },
  { resource: "user", action: "create" }
)
```

## 最佳实践和安全建议

### 1. 安全配置

```typescript
// 1. 限制登录尝试
import { rateLimit } from "better-auth/plugins"

auth.use(rateLimit({
  window: 15 * 60, // 15分钟
  max: 5, // 最多5次
  storage: "redis", // 使用 Redis 存储
}))

// 2. 会话安全
session: {
  cookieName: "company-oa-session",
  cookieOptions: {
    httpOnly: true,
    secure: true, // HTTPS only
    sameSite: "lax",
  }
}

// 3. 密码策略
emailAndPassword: {
  minPasswordLength: 10,
  requireUppercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
}
```

### 2. 监控和审计

```typescript
// 审计日志 Hook
hooks: {
  after: [
    {
      matcher: (ctx) => {
        // 只记录重要操作
        const importantPaths = ["/user", "/department", "/role"]
        return importantPaths.some(path => ctx.request?.url?.includes(path))
      },
      handler: async (ctx) => {
        await logAuditEvent({
          userId: ctx.context.session?.userId,
          action: ctx.body?.action || ctx.request?.method,
          resource: ctx.request?.url,
          changes: ctx.body,
          timestamp: new Date(),
        })
      }
    }
  ]
}
```

### 3. 性能优化

```typescript
// 1. 缓存权限检查结果
const permissionCache = new Map()

export function getCachedPermission(userId: string, permission: string) {
  const key = `${userId}:${permission}`
  if (permissionCache.has(key)) {
    return permissionCache.get(key)
  }
  
  const result = checkPermission(userId, permission)
  permissionCache.set(key, result)
  
  // 5分钟后过期
  setTimeout(() => permissionCache.delete(key), 5 * 60 * 1000)
  
  return result
}

// 2. 预加载用户权限
export async function preloadUserPermissions(userId: string) {
  const user = await db.query.user.findFirst({
    where: eq(user.id, userId),
    with: {
      role: true,
      department: true,
    }
  })
  
  // 缓存用户完整权限
  return cacheUserPermissions(user)
}
```

## 总结

Better Auth 提供了一个强大而灵活的认证授权框架，特别适合构建企业级应用：

### 核心优势

1. **类型安全**：完整的 TypeScript 支持，减少运行时错误
2. **功能完备**：支持多种认证方式，满足企业各种需求
3. **易于扩展**：插件系统让功能扩展变得简单
4. **安全可靠**：内置安全最佳实践，如 CSRF 保护、会话管理等
5. **性能优秀**：轻量级设计，最小运行时开销

### 适用场景

- 企业内部管理系统
- SaaS 应用
- 需要复杂权限控制的系统
- 多租户应用
- 需要合规审计的系统

### 实施建议

1. **从简单开始**：先实现基础认证，再逐步添加高级功能
2. **权限设计先行**：在开发前仔细设计权限模型
3. **注重用户体验**：提供多种登录方式，但不要让用户困惑
4. **安全第一**：启用所有安全功能，定期审查权限配置
5. **监控和审计**：记录所有重要操作，便于问题追踪

通过 Better Auth，我们可以快速构建一个安全、可靠、易维护的企业级认证系统，让开发者专注于业务逻辑的实现。

## 相关资源

- [Better Auth 官方文档](https://better-auth.com)
- [GitHub 仓库](https://github.com/better-auth/better-auth)
- [示例项目](https://github.com/better-auth/better-auth/tree/main/examples)
- [社区讨论](https://discord.gg/better-auth)

---

*希望这篇指南能帮助你深入理解 Better Auth，构建出色的认证系统！*