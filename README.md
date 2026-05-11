# Bible On Air API

NestJS REST API backend for the Bible On Air devotional platform.

## Overview

This repository contains the backend server for Bible On Air, a daily devotional content management system.
It supports article templates, block-based devotional content, Bible verse lookup and caching, editorial review workflows, JWT authentication, and PostgreSQL storage.

## Features

- NestJS 10 + TypeORM backend
- PostgreSQL data persistence
- JWT authentication with admin/editor roles
- Article, publication, magazine, article template, and Bible scripture management
- Bible verse range parsing, cache, and external provider integration
- File uploads and seeded database support
- Test support with Jest and end-to-end tests

## Quick Start

1. Install dependencies

   ```bash
   yarn install
   ```

2. Copy environment vars

   ```bash
   cp .env.example .env
   ```

3. Start development server

   ```bash
   yarn dev
   ```

4. Build for production

   ```bash
   yarn build
   ```

## Scripts

- `yarn dev` - start NestJS in watch mode
- `yarn start` - start NestJS
- `yarn build` - compile TypeScript
- `yarn test` - run Jest tests
- `yarn test:e2e` - run end-to-end tests
- `yarn lint` - run ESLint
- `yarn format` - run Prettier
- `yarn seed` - seed the database

## Environment

Required environment variables are configured in `.env` and described in `.env.example`.

## License

Apache License 2.0
