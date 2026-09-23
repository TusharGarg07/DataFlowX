# DataFlowX — Frontend (F1 Foundation)

This is the frontend application for DataFlowX — Research Data Processing Platform, built with React, TypeScript, Vite, Tailwind CSS, TanStack Query, and React Router.

## Stack & Architecture

- Framework: React 18 + Vite
- Language: TypeScript (Strict mode)
- Styling: Tailwind CSS
- Server State: TanStack Query v5
- Routing: React Router v6
- Architecture: Feature-Sliced Design (app, features, shared, layouts)
- API Strategy: Typed native fetch wrapper in shared/api/http.ts with same-origin Vite proxy /api -> http://localhost:8080.

## Getting Started

### 1. Install Dependencies
npm install

### 2. Environment Configuration
Copy .env.example to .env.local:
cp .env.example .env.local

### 3. Run Development Server
npm run dev

### 4. Quality Commands
npm run typecheck
npm run lint
npm run test
npm run build
