import type { Request, Response } from "express";
import Groq from "groq-sdk";
import { ENV } from "../config/env";
import { VoiceCommand } from "../models/voice-engineer";

const groq = new Groq({ apiKey: ENV.GROQ_API_KEY });
const GROQ_MODEL = "llama-3.3-70b-versatile";

// -----------------------------------------------------------------------------
// Types (mirrors the frontend's VoiceCommand contract)
// -----------------------------------------------------------------------------

interface GeneratedFile {
  path: string;
  language: string;
  content: string;
}

interface VoiceEngineerOutput {
  output: string;
  generatedFiles: GeneratedFile[];
}

interface LLMOutput {
  output?: string;
  generatedFiles?: GeneratedFile[];
}

// -----------------------------------------------------------------------------
// Config
// -----------------------------------------------------------------------------

const MAX_TRANSCRIPT_CHARS = 2000;
const GROQ_TEMPERATURE = 0.3;
const GROQ_MAX_RETRIES = 2;
const GROQ_COMPLETION_TOKENS = 1500;

// -----------------------------------------------------------------------------
// System instruction
// -----------------------------------------------------------------------------

const SYSTEM_INSTRUCTION = `You are Aether Code Engineer AI.

You are an elite software architect and senior engineer capable of building production-ready software in ANY programming language, framework, platform, or technology stack.

Your objective is to transform a user's natural language request into a complete implementation by generating fully functional source code files.

You must think like an experienced software engineer designing a real-world project.

Your response is consumed by another AI system and parsed automatically.

--------------------------------------------------
ABSOLUTE OUTPUT RULES
--------------------------------------------------

Return ONLY one valid JSON object.

Never output:

- Markdown
- Triple backticks
- Explanations
- Notes
- Comments outside source code
- Extra text before or after JSON

The response MUST be valid JSON that can be parsed using JSON.parse().

--------------------------------------------------
OUTPUT SCHEMA
--------------------------------------------------

{
  "output": "string",
  "generatedFiles": [
    {
      "path": "string",
      "language": "string",
      "content": "string"
    }
  ]
}

Do not add additional properties.

--------------------------------------------------
FIELD DEFINITIONS
--------------------------------------------------

output

• Maximum 200 characters.
• Briefly summarize what was generated.
• Mention the major feature(s).

Example

"Generated JWT authentication with frontend UI, backend API, database model, middleware and unit tests."

generatedFiles

Each item represents one COMPLETE source file.

Each object contains

path
Relative file path including filename and extension.

Examples

src/controllers/AuthController.java
src/services/AuthService.java
frontend/src/pages/Login.tsx
backend/app.py
lib/main.dart

language

Programming language.

Examples

java
kotlin
typescript
javascript
python
go
rust
dart
php
ruby
swift
csharp
cpp
c

content

Complete source code.

Rules

• Must contain the COMPLETE implementation.
• Never truncate.
• Never replace code with "..."
• Never use TODO.
• Never use placeholder implementations.
• Never omit imports.
• Never omit package declarations.
• Never omit namespaces.
• Never omit helper methods if required.
• Never omit classes that belong in that file.
• Code should compile whenever possible.

--------------------------------------------------
PRIMARY OBJECTIVE
--------------------------------------------------

Generate production-quality code.

Infer everything required to implement the requested feature.

Generate only files that are actually required.

Think like a senior engineer.

Do not generate unnecessary files.

--------------------------------------------------
TECHNOLOGY DETECTION
--------------------------------------------------

Automatically detect

• Programming language
• Framework
• Runtime
• Platform
• Database
• Build system
• API architecture

If the user specifies a technology, ALWAYS use it.

Never replace requested technologies.

If multiple technologies are mentioned, generate files for each.

Example

React + Express

Generate

React frontend

Express backend

If the user requests

Flutter + Firebase

Generate

Flutter code

Firebase configuration

Cloud Functions when required

--------------------------------------------------
SUPPORTED LANGUAGES
--------------------------------------------------

Support every major programming language including

Java
Kotlin
Scala
Groovy
C#
F#
Python
Go
Rust
PHP
Ruby
JavaScript
TypeScript
Dart
Swift
Objective-C
C
C++
Lua
Elixir
Haskell
MATLAB
R

Use the correct file extensions.

--------------------------------------------------
SUPPORTED FRAMEWORKS
--------------------------------------------------

Examples include

React
React Native
Next.js
Vue
Nuxt
Angular
Svelte
Flutter
Android
Jetpack Compose
SwiftUI
UIKit
Electron

Node.js
Express
NestJS
Fastify

Spring Boot
Micronaut
Quarkus

ASP.NET Core

FastAPI
Flask
Django

Laravel
Symfony

Ruby on Rails

Go Gin
Fiber
Echo

Rust Axum
Actix

Phoenix

and other modern frameworks.

--------------------------------------------------
ARCHITECTURE
--------------------------------------------------

Follow best practices.

Generate modular production-ready architecture.

Use ecosystem conventions.

Examples

React

components
pages
hooks
context
services
api
store

Express

controllers
services
routes
middleware
validators
models

Spring Boot

Controller
Service
Repository
Entity
DTO
Configuration
Security

NestJS

Module
Controller
Service
DTO
Guard

Flutter

screens
widgets
providers
services

Android

Activity
Fragment
Repository
ViewModel

iOS

ViewController
Views
Managers

--------------------------------------------------
FEATURE INFERENCE
--------------------------------------------------

Infer supporting files automatically.

Authentication

Generate

Login UI

Registration UI

JWT

OAuth

Authentication Service

Middleware

Guards

Validation

Database Model

API Routes

Tests

CRUD

Generate

Controller

Repository

Service

Model

Validation

DTO

Tests

Payments

Generate

Webhook

Payment Service

Routes

Configuration

Tests

Notifications

Generate

Notification Service

WebSocket or SSE

API

Hooks

Tests

Chat

Generate

Socket Layer

Message Model

Controller

Service

UI

Tests

Dashboard

Generate

Pages

Components

Charts

API

Hooks

File Upload

Generate

Storage Service

Upload Middleware

Validation

Configuration

Tests

--------------------------------------------------
DATABASE SUPPORT
--------------------------------------------------

Generate files appropriate for

Prisma

Hibernate

JPA

Entity Framework

TypeORM

Sequelize

Mongoose

MongoDB

MySQL

PostgreSQL

SQLite

Firebase

Supabase

--------------------------------------------------
API TYPES
--------------------------------------------------

REST

Controller

Routes

Services

GraphQL

Schema

Resolver

WebSocket

Gateway

Handler

SSE

Publisher

Listener

--------------------------------------------------
TESTS
--------------------------------------------------

Generate tests whenever appropriate.

Use framework conventions.

Examples

AuthControllerTest.java

auth.test.ts

test_auth.py

payment_test.go

--------------------------------------------------
CONFIGURATION
--------------------------------------------------

Only generate configuration files if required.

Examples

SecurityConfig

JwtConfig

firebase.json

Dockerfile

docker-compose.yml

nginx.conf

tailwind.config.js

vite.config.ts

--------------------------------------------------
CODE QUALITY
--------------------------------------------------

Every generated file must

Compile whenever possible

Use production-quality code

Contain all imports

Contain all dependencies required inside the file

Use proper formatting

Follow framework conventions

Avoid dead code

Avoid placeholder code

Avoid duplicate logic

Use meaningful names

Separate concerns correctly

--------------------------------------------------
STRICTLY FORBIDDEN
--------------------------------------------------

Never output markdown.

Never output explanations.

Never output fake files.

Never output folders.

Never output partial code.

Never output "implementation omitted".

Never output TODO.

Never output placeholder methods.

Never generate unrelated features.

Never mix incompatible frameworks.

Never create duplicate files.

--------------------------------------------------
FINAL RULE

Your entire response must consist of ONLY one valid JSON object.

Every generated file must contain complete source code.

The JSON must be directly usable to:

• Display a project tree
• Open and view source files
• Save files to disk
• Download the generated project as a ZIP

Generate only the files necessary to implement the user's request completely.`;

// -----------------------------------------------------------------------------
// Helpers: response parsing / validation
// -----------------------------------------------------------------------------

function safeParseJson(raw: string): any | null {
  const cleaned = raw
    .trim()
    .replace(/^```(json)?/i, "")
    .replace(/```$/, "")
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        return null;
      }
    }
    return null;
  }
}

function isValidGeneratedFile(value: unknown): value is GeneratedFile {
  return (
    !!value &&
    typeof value === "object" &&
    typeof (value as any).path === "string" &&
    (value as any).path.trim().length > 0 &&
    typeof (value as any).content === "string" &&
    // language is expected but we don't hard-fail the whole batch over it;
    // default it downstream if missing/blank
    (typeof (value as any).language === "string" || (value as any).language === undefined)
  );
}

function isValidLLMOutput(value: any): value is LLMOutput {
  return (
    !!value &&
    typeof value.output === "string" &&
    value.output.trim().length > 0 &&
    Array.isArray(value.generatedFiles) &&
    value.generatedFiles.length > 0 &&
    value.generatedFiles.every(isValidGeneratedFile)
  );
}

function normalizeGeneratedFiles(files: GeneratedFile[]): GeneratedFile[] {
  return files.map((f) => ({
    path: f.path.trim(),
    language: (f.language || inferLanguageFromPath(f.path)).trim(),
    content: f.content,
  }));
}

function inferLanguageFromPath(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() || "";
  const map: Record<string, string> = {
    ts: "typescript",
    tsx: "typescript",
    js: "javascript",
    jsx: "javascript",
    py: "python",
    go: "go",
    rs: "rust",
    java: "java",
    kt: "kotlin",
    dart: "dart",
    php: "php",
    rb: "ruby",
    swift: "swift",
    cs: "csharp",
    cpp: "cpp",
    c: "c",
    json: "json",
    yml: "yaml",
    yaml: "yaml",
    html: "html",
    css: "css",
  };
  return map[ext] || "text";
}

// -----------------------------------------------------------------------------
// Helpers: Groq rate-limit detection
// -----------------------------------------------------------------------------

interface GroqRateLimitInfo {
  isRateLimited: boolean;
  scope: "day" | "minute" | "unknown";
  retryAfterSeconds?: number;
  message: string;
}

function parseRetryAfterSeconds(message: string): number | undefined {
  const match = message.match(/try again in\s*(?:(\d+)h)?\s*(?:(\d+)m)?\s*(?:(\d+(?:\.\d+)?)s)?/i);
  if (!match) return undefined;
  const hours = Number(match[1] || 0);
  const minutes = Number(match[2] || 0);
  const seconds = Number(match[3] || 0);
  const total = hours * 3600 + minutes * 60 + seconds;
  return total > 0 ? Math.ceil(total) : undefined;
}

function inspectGroqError(err: unknown): GroqRateLimitInfo {
  const status = (err as any)?.status ?? (err as any)?.response?.status;
  const apiError = (err as any)?.error?.error ?? (err as any)?.error;
  const code = apiError?.code;
  const message: string = apiError?.message || (err as Error)?.message || "Unknown Groq error";

  if (status !== 429 && code !== "rate_limit_exceeded") {
    return { isRateLimited: false, scope: "unknown", message };
  }

  const scope: "day" | "minute" | "unknown" = /tokens per day|TPD/i.test(message)
    ? "day"
    : /tokens per minute|TPM/i.test(message)
    ? "minute"
    : "unknown";

  return { isRateLimited: true, scope, retryAfterSeconds: parseRetryAfterSeconds(message), message };
}

// -----------------------------------------------------------------------------
// Groq call
// -----------------------------------------------------------------------------

async function generateVoiceEngineerResponse(transcript: string): Promise<VoiceEngineerOutput> {
  if (!ENV.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY is not configured on the server");
  }

  let lastError: unknown = null;

  for (let attempt = 1; attempt <= GROQ_MAX_RETRIES; attempt++) {
    try {
      const completion = await groq.chat.completions.create({
        model: GROQ_MODEL,
        temperature: GROQ_TEMPERATURE,
        max_tokens: GROQ_COMPLETION_TOKENS,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_INSTRUCTION },
          {
            role: "user",
            content:
              attempt === 1
                ? `Generate implementation plan for: "${transcript}"`
                : `Generate implementation plan for: "${transcript}"\n\nYour previous response was not valid JSON matching the required schema. Return ONLY the raw JSON object this time — no markdown, no commentary, no missing fields. "generatedFiles" must be an array of objects, each with "path", "language", and "content" string fields.`,
          },
        ],
      });

      const raw = completion.choices[0]?.message?.content || "";
      const parsed = safeParseJson(raw);

      if (isValidLLMOutput(parsed)) {
        return {
          output: parsed.output!.trim(),
          generatedFiles: normalizeGeneratedFiles(parsed.generatedFiles!),
        };
      }

      lastError = new Error("Groq returned a response that did not match the expected schema");
    } catch (err) {
      const rateLimitInfo = inspectGroqError(err);

      if (rateLimitInfo.isRateLimited) {
        throw Object.assign(new Error(rateLimitInfo.message), { groqRateLimit: rateLimitInfo });
      }

      lastError = err;
      console.warn(`[voice-engineer] Groq call attempt ${attempt} failed:`, (err as Error).message);
    }
  }

  throw lastError || new Error("Groq returned an empty or invalid response");
}

// -----------------------------------------------------------------------------
// Controller
// -----------------------------------------------------------------------------

/**
 * POST /api/v1/voice-engineer/generate
 * body: { transcript: string, userId?: string }
 */
export async function generateVoiceCommand(req: Request, res: Response) {
  try {
    const { transcript, userId } = req.body as { transcript?: string; userId?: string };

    if (!transcript || !transcript.trim()) {
      return res.status(400).json({ success: false, message: "transcript is required" });
    }

    const trimmedTranscript = transcript.trim().slice(0, MAX_TRANSCRIPT_CHARS);

    // Create initial command with "building" status
    const command = await VoiceCommand.create({
      userId: userId || null,
      transcript: trimmedTranscript,
      status: "building",
    });

    let llmResult: VoiceEngineerOutput;
    try {
      llmResult = await generateVoiceEngineerResponse(trimmedTranscript);
    } catch (err: any) {
      // Update command status to error
      await VoiceCommand.findByIdAndUpdate(command._id, {
        status: "complete",
        output: "Failed to generate implementation plan. Please try again.",
      });

      const rateLimit: GroqRateLimitInfo | undefined = err?.groqRateLimit;

      if (rateLimit?.isRateLimited) {
        if (rateLimit.retryAfterSeconds) {
          res.set("Retry-After", String(rateLimit.retryAfterSeconds));
        }
        return res.status(429).json({
          success: false,
          message:
            rateLimit.scope === "day"
              ? "Daily AI generation budget has been used up for today. Try again later."
              : "Voice engineer generation is temporarily rate-limited. Try again in a moment.",
          scope: rateLimit.scope,
          retryAfterSeconds: rateLimit.retryAfterSeconds,
        });
      }

      return res.status(502).json({
        success: false,
        message: err?.message || "Failed to generate implementation plan",
      });
    }

    // Update command with successful result
    const updatedCommand = await VoiceCommand.findByIdAndUpdate(
      command._id,
      {
        status: "complete",
        output: llmResult.output,
        generatedFiles: llmResult.generatedFiles,
      },
      { new: true }
    );

    return res.status(200).json({
      success: true,
      command: {
        id: updatedCommand?._id,
        transcript: updatedCommand?.transcript,
        status: updatedCommand?.status,
        output: updatedCommand?.output,
        generatedFiles: updatedCommand?.generatedFiles,
      },
    });
  } catch (err: any) {
    console.error("[voice-engineer.generateVoiceCommand]", err);
    return res.status(500).json({
      success: false,
      message: err?.message || "Voice engineer generation failed",
    });
  }
}

/**
 * GET /api/v1/voice-engineer/history?userId=...
 * Returns past voice commands for a user
 */
export async function getVoiceHistory(req: Request, res: Response) {
  try {
    const { userId } = req.query as { userId?: string };
    const filter: Record<string, any> = {};
    if (userId) filter.userId = userId;

    const commands = await VoiceCommand.find(filter)
      .sort({ createdAt: -1 })
      .limit(20);

    return res.status(200).json({
      success: true,
      commands: commands.map((cmd) => ({
        id: cmd._id,
        transcript: cmd.transcript,
        status: cmd.status,
        output: cmd.output,
        generatedFiles: cmd.generatedFiles,
        createdAt: cmd.createdAt,
      })),
    });
  } catch (err: any) {
    console.error("[voice-engineer.getVoiceHistory]", err);
    return res.status(500).json({
      success: false,
      message: err?.message || "Failed to fetch voice history",
    });
  }
}