# LiveAuctioner - 直播竞拍系统

<div align="center">

<img src="https://img.shields.io/badge/Version-1.0.0-blue?style=flat-square" alt="Version" />
<img src="https://img.shields.io/badge/License-MIT-green?style=flat-square" alt="License" />
<img src="https://img.shields.io/badge/Node-%3E%3D18-brightgreen?style=flat-square" alt="Node" />
<img src="https://img.shields.io/badge/React-18-61DAFB?style=flat-square" alt="React" />
<img src="https://img.shields.io/badge/NestJS-10-E0234E?style=flat-square" alt="NestJS" />
<img src="https://img.shields.io/badge/PostgreSQL-15-336791?style=flat-square" alt="PostgreSQL" />
<img src="https://img.shields.io/badge/Redis-7-DC382D?style=flat-square" alt="Redis" />
<img src="https://img.shields.io/badge/Socket.IO-4-010101?style=flat-square" alt="Socket.IO" />
<img src="https://img.shields.io/badge/Docker-24-2496ED?style=flat-square" alt="Docker" />

一个面向直播电商场景的全栈竞拍系统，支持珠宝、二手奢侈品等高价值非标品的实时动态竞拍。

</div>

## 核心功能

- 实时竞拍：毫秒级出价、动态排名、倒计时
- 商品管理：上架、审核、分类
- 订单系统：支付、发货、收货、一次性退款申请、卖家退款处理、退款仲裁
- 信用体系：保证金、信用分、违约处理
- 管理后台：商品审核、用户管理、数据统计

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React + Zustand + Vite |
| 后端 | Node.js + NestJS |
| 数据库 | PostgreSQL + Redis |
| 实时通信 | Socket.IO |
| ORM | Prisma |
| Monorepo | pnpm + Turborepo |
| 部署 | Docker + Docker Compose |

## 快速开始

### 环境要求

- Node.js >= 18
- pnpm >= 8
- 本地 PostgreSQL 15+
- Docker & Docker Compose（仅用于本地 Redis）

### 安装依赖

```bash
pnpm install
```

### 启动开发环境（本地 PostgreSQL + Docker Redis）

```bash
# 启动 Redis（本地开发只用 Docker 跑 Redis）
docker-compose up -d redis

# PostgreSQL 请使用本机服务，并确保 .env 中 DATABASE_URL 指向本地 PostgreSQL
# 示例：DATABASE_URL=postgresql://postgres:123456@localhost:5432/liveauction?schema=public

# 同时启动前后端（推荐）
pnpm run dev

# 或分别启动
pnpm --filter backend run dev
pnpm --filter frontend run dev
```

### 纯 Docker 启动数据库依赖

如果本机没有 PostgreSQL，或者希望数据库依赖全部由 Docker 管理，可以同时启动 PostgreSQL 和 Redis：

```bash
# 启动 PostgreSQL + Redis
docker-compose up -d postgres redis

# .env 中 DATABASE_URL 保持指向 localhost 暴露端口
# DATABASE_URL=postgresql://postgres:123456@localhost:5432/liveauction?schema=public
# REDIS_URL=redis://localhost:6379

# 生成 Prisma Client 并执行迁移
pnpm run db:generate
pnpm run db:migrate

# 启动前后端
pnpm run dev
```

### 访问应用

- 前端：http://localhost:3000
- 后端 API：http://localhost:4000

### 默认管理员账号

后端启动时会自动检查并创建默认管理员账号，用于访问审核后台。

```text
用户名：admin
密码：admin123456
```

可通过 `.env` 覆盖：

```bash
DEFAULT_ADMIN_USERNAME=admin
DEFAULT_ADMIN_PASSWORD=admin123456
```

管理员登录后会在顶部导航看到“审核后台”，可进入商品审核页面处理商家提交的商品。

## 项目结构

```
price_killer/
├── packages/
│   ├── frontend/          # React 前端
│   ├── backend/           # NestJS 后端
│   └── shared/            # 共享类型定义
├── docker-compose.yml     # Docker 编排
├── pnpm-workspace.yaml    # Monorepo 配置
├── turbo.json             # Turborepo 配置
└── docs/                  # 设计文档
```

## 文档

- [系统设计文档](docs/specs/2026-05-18-auction-system-design.md)
- [MVP 开发文档](docs/specs/development-guide.md)

## 开发阶段

| 阶段 | 内容 | 状态 |
|------|------|------|
| Phase 1 | 项目初始化 + Monorepo 搭建 + 数据库设计 | ✅ 已完成 |
| Phase 2 | 用户系统（注册登录、角色权限、充值、地址） | ✅ 已完成 |
| Phase 3 | 商品管理（CRUD、图片上传、审核） | ✅ 已完成 |
| Phase 4 | 核心拍卖引擎（状态机、出价、Redis、WebSocket） | ✅ 功能完成，测试后置 |
| Phase 5 | 订单系统（生成、支付、发货、收货、退款纠纷） | ✅ 功能完成，测试后置 |
| Phase 6 | 信用体系（保证金、信用分、违约处理） | 🚧 后端核心进行中 |
| Phase 7 | 管理后台（审核、仲裁/小法庭、数据统计） | 待开始 |
| Phase 8 | 前端 UI 完善 + 联调 | 待开始 |
| Phase 9 | Docker 部署 + 文档 | 待开始 |

### 当前总体进度

- 当前已经完成到 Phase 5：拍卖主链路、订单履约闭环、余额支付、一次性退款申请、卖家退款处理和管理员仲裁都已具备基础可用闭环。
- Phase 6 后端核心已经开始：出价冻结保证金、结拍/取消/支付释放保证金、待支付违约扣保证金与扣信用分、订单完成信用奖励已接入。
- 测试脚本按前面约定统一后置，当前只做 TypeScript 检查和手工联调。
- 下一步继续 Phase 6：补前端保证金/信用展示、出价前提示和针对性测试脚本。

### 当前 Phase 4 进展

- 已实现拍卖列表、详情、卖家拍卖管理、创建/编辑、开始、手动落锤、取消。
- 已接入 Socket.IO 房间事件：`join_auction`、`leave_auction`、`place_bid`、`auction_update`、`bid_placed`、`auction_ended`，并广播在线人数。
- 已使用 Redis Lua 脚本处理进行中拍卖的原子出价校验与最高价更新，PostgreSQL 作为最终持久化。
- 已支持到期拍卖的后端定时结拍，并在成交时生成基础待支付订单。
- 当前仓库暂未编写测试文件；所有单元测试、集成测试、E2E 与并发压测统一后置到功能开发完成后补齐。

### 当前 Phase 5 进展

- 已拆分正式 `order` 后端模块。
- 已补齐买家订单列表、卖家订单列表和订单详情接口。
- 已实现模拟余额支付、卖家发货、买家确认收货、待支付订单取消。
- 已实现超时未支付自动取消、发货后自动确认收货。
- 已实现退款申请、订单争议、卖家同意退款/拒绝退款、管理员同意退款/驳回退款。
- 拍卖订单售后按轻量规则处理：每笔订单最多申请一次退款；卖家可直接同意退款，拒绝退款后订单进入管理员仲裁。
- 已补齐买家“我的订单”、卖家“订单管理”、订单详情和管理员“订单仲裁”页面。
- Phase 5 的测试脚本统一后置到功能开发完成后补齐。

### 当前 Phase 6 进展

- 已新增后端 `deposit` 模块，支持查询我的保证金记录，并提供事务内冻结、解冻和扣除能力。
- 出价成功持久化前会按信用等级计算保证金比例并冻结余额；低信用用户会提高保证金比例，严重低信用用户禁止参与竞拍。
- 受限信用用户最多同时参与 3 场进行中的拍卖。
- 拍卖成交后自动解冻未中标者保证金；流拍或取消拍卖会解冻全部保证金。
- 中标者保证金保留到订单阶段：支付成功后退回；取消待支付订单或超时未支付会扣除保证金并扣信用分。
- 买家确认收货或系统自动确认收货后，会给买卖双方记录信用分奖励。
- 下一步：补前端保证金/信用展示与出价提示，并补 Phase 6 的验证脚本。

## 架构演进

- **Phase 1 (MVP):** 纯 Node.js 单体应用
- **Phase 2+:** 预留将竞拍引擎拆分为 Go 微服务的接口空间

## License

MIT
