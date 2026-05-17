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
- 订单系统：支付、发货、收货、退款仲裁
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
- Docker & Docker Compose

### 安装依赖

```bash
pnpm install
```

### 启动开发环境

```bash
# 启动数据库服务
docker-compose up -d postgres redis

# 启动后端
cd packages/backend
pnpm run start:dev

# 启动前端
cd packages/frontend
pnpm run dev
```

### 访问应用

- 前端：http://localhost:3000
- 后端 API：http://localhost:4000

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

## 开发阶段

| 阶段 | 内容 | 状态 |
|------|------|------|
| Phase 1 | 项目初始化 + Monorepo 搭建 + 数据库设计 | 待开始 |
| Phase 2 | 用户系统 | 待开始 |
| Phase 3 | 商品管理 | 待开始 |
| Phase 4 | 核心拍卖引擎 | 待开始 |
| Phase 5 | 订单系统 | 待开始 |
| Phase 6 | 信用体系 | 待开始 |
| Phase 7 | 管理后台 | 待开始 |
| Phase 8 | 前端 UI | 待开始 |
| Phase 9 | 部署 | 待开始 |

## 架构演进

- **Phase 1 (MVP):** 纯 Node.js 单体应用
- **Phase 2+:** 预留将竞拍引擎拆分为 Go 微服务的接口空间

## License

MIT
