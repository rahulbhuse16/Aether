import Groq from "groq-sdk";
import { ENV } from "../config/env";

const { GROQ_API_KEY } = ENV;

const groq = new Groq({ apiKey: GROQ_API_KEY });

// Llama 3.3 70B on Groq: strong enough reasoning for code/issue analysis,
// fast enough to reply inside a live Slack thread within a few seconds.
const MODEL = "llama-3.3-70b-versatile";

export type MentionIntent =
  | "analyze_issue"
  | "create_task"
  | "bug_report"
  | "general_question";

export interface IntentClassification {
  intent: MentionIntent;
  issueNumber: string | null;
  taskTitle: string | null;
  taskPriority: "low" | "medium" | "high" | null;
  /**
   * A repo the user explicitly named in the mention — "aether-backend",
   * "owner/repo", "the frontend repo", etc. Null if they didn't name one;
   * the caller resolves this against their actual connected repos via
   * githubService.resolveRepo(), so this is a raw hint, not a validated
   * repo name.
   */
  repoHint: string | null;
}

export interface IssueAnalysis {
  rootCause: string;
  recommendedFix: string[];
  confidence: number;
}

export interface BugAnalysis {
  rootCause: string;
  recommendedFix: string;
  confidence: number;
}

export interface DailySummaryInput {
  githubOpened: number;
  githubClosed: number;
  highPriorityBugs: number;
  tasksCompleted: number;
  tasksOverdue: number;
  topIssueTitles: string[];
}

export interface DailySummaryOutput {
  insights: string[];
  recommendedAction: string;
}

/**
 * Optional project context injected into every AI call when available.
 * This grounds Aether's responses in the user's actual codebase rather
 * than generic engineering advice.
 */
export interface ProjectContext {
  repoName: string;
  description?: string;
  stack: string[];
  recentIssues?: string[];
}

/**
 * Real file contents pulled live from GitHub via
 * githubService.getRepoCodeContext(). Kept as a locally-defined shape
 * (rather than importing RepoCodeContext from github.service) to avoid a
 * circular import between the two services — the fields just need to
 * line up.
 */
export interface RepoCodeGrounding {
  repoFullName: string;
  branch: string;
  files: { path: string; content: string }[];
  readmeExcerpt: string | null;
}

function buildProjectContextBlock(projects?: ProjectContext[]): string {
  if (!projects || projects.length === 0) return "";

  const lines = projects.map((p) => {
    const parts = [`Repository: ${p.repoName}`];
    if (p.description) parts.push(`Description: ${p.description}`);
    if (p.stack.length > 0) parts.push(`Tech stack: ${p.stack.join(", ")}`);
    if (p.recentIssues && p.recentIssues.length > 0) {
      parts.push(`Recent issues: ${p.recentIssues.slice(0, 5).join("; ")}`);
    }
    return parts.join("\n  ");
  });

  return `\n\n--- PROJECT CONTEXT ---\nThe user is working on the following project(s). Use this to give project-specific answers:\n${lines.join("\n\n")}
--- END PROJECT CONTEXT ---`;
}

/**
 * Renders real repo file contents into the prompt so Aether can reference
 * actual function names, file paths, and existing patterns instead of
 * guessing. This is the single biggest lever for response accuracy —
 * without it, "recommended fix" is generic advice; with it, it's a
 * specific diff against real code.
 */
function buildRepoCodeContextBlock(repoCode?: RepoCodeGrounding | null): string {
  if (!repoCode || repoCode.files.length === 0) return "";

  const fileBlocks = repoCode.files
    .map((f) => `--- ${f.path} ---\n${f.content}`)
    .join("\n\n");

  return `\n\n--- REPO CODE CONTEXT (${repoCode.repoFullName}@${repoCode.branch}) ---
These are the actual files from the user's repository most relevant to this request. Ground your analysis in this real code: reference the exact file paths, function/variable names, and existing patterns shown below. Do NOT invent file names or code that isn't shown here.
${repoCode.readmeExcerpt ? `README excerpt:\n${repoCode.readmeExcerpt}\n\n` : ""}${fileBlocks}
--- END REPO CODE CONTEXT ---`;
}

/**
 * Shared helper: one narrow system prompt per job, forced JSON output, low
 * temperature. Aether is replying inline in a live Slack thread — an
 * off-format or rambling response breaks the bot, so structure is
 * non-negotiable here, not a nice-to-have.
 */
async function completeJson<T>(system: string, user: string): Promise<T> {
  const response = await groq.chat.completions.create({
    model: MODEL,
    temperature: 0.15,
    max_tokens: 2048,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("Groq returned an empty response");
  }

  return JSON.parse(content) as T;
}

export const groqService = {
  /**
   * First step for every @Aether mention: decide what the person wants
   * AND which repo (if any) they named, before doing any work — so
   * neither a GitHub lookup nor a repo-code fetch fires against the
   * wrong repo, or fires at all for a plain question.
   */
  classifyMention: async (
    messageText: string,
    projects?: ProjectContext[]
  ): Promise<IntentClassification> => {
    const projectCtx = buildProjectContextBlock(projects);

    const system = `You are the intent router for Aether, an AI engineering teammate that lives in Slack.
Your job is to classify the user's message into exactly one intent, and separately extract any repo they explicitly named, so Aether can take the right action against the right repo.

## Intents

1. "analyze_issue" — wants Aether to look at a specific GitHub issue.
   Signals: an issue number (#142, issue 42), "look at", "analyze", "check", "review" an issue/PR by number.

2. "create_task" — wants Aether to create a task/todo item.
   Signals: "create a task", "add a task", "todo:", "remind me to", "track this".

3. "bug_report" — pasted an error message, stack trace, exception, or log output and wants debugging help.
   Signals: stack traces, error codes, exception names (TypeError, NullPointerException, ECONNREFUSED), log lines with timestamps, "getting this error", "this broke", "why is this failing".

4. "general_question" — any other question or conversation directed at Aether.
   Signals: "how do I", "what's the best way to", "explain", architecture questions, "what does X do in <repo>".

## Repo hint extraction (repoHint)
Separately from the intent, check whether the user explicitly named a repository anywhere in the message — patterns like "in <repo>", "on <owner/repo>", "the <repo> repo", "repo: <name>", or a bare "owner/repo" string.
- Only extract a repo name that is ACTUALLY present in the text. Never guess or infer one that wasn't mentioned.
- If no repo is named, repoHint must be null — do not default to a repo name from context or examples.

## Few-shot examples

User: "can you look at issue #142 and tell me what's going on?"
→ { "intent": "analyze_issue", "issueNumber": "142", "taskTitle": null, "taskPriority": null, "repoHint": null }

User: "analyze issue #142 in aether-backend"
→ { "intent": "analyze_issue", "issueNumber": "142", "taskTitle": null, "taskPriority": null, "repoHint": "aether-backend" }

User: "look at issue #9 on acme-corp/payments-service"
→ { "intent": "analyze_issue", "issueNumber": "9", "taskTitle": null, "taskPriority": null, "repoHint": "acme-corp/payments-service" }

User: "create a task: fix the login page responsive layout, priority high"
→ { "intent": "create_task", "issueNumber": null, "taskTitle": "fix the login page responsive layout", "taskPriority": "high", "repoHint": null }

User: "TypeError: Cannot read properties of undefined (reading 'map') at UserList.tsx:42"
→ { "intent": "bug_report", "issueNumber": null, "taskTitle": null, "taskPriority": null, "repoHint": null }

User: "in the aether-frontend repo, getting TypeError: Cannot read properties of undefined (reading 'map') at UserList.tsx:42"
→ { "intent": "bug_report", "issueNumber": null, "taskTitle": null, "taskPriority": null, "repoHint": "aether-frontend" }

User: "what's the best caching strategy for our API endpoints?"
→ { "intent": "general_question", "issueNumber": null, "taskTitle": null, "taskPriority": null, "repoHint": null }

User: "what does the UserService class do in aether-backend?"
→ { "intent": "general_question", "issueNumber": null, "taskTitle": null, "taskPriority": null, "repoHint": "aether-backend" }

User: "review #87"
→ { "intent": "analyze_issue", "issueNumber": "87", "taskTitle": null, "taskPriority": null, "repoHint": null }

User: "todo: update the README with new API endpoints"
→ { "intent": "create_task", "issueNumber": null, "taskTitle": "update the README with new API endpoints", "taskPriority": "medium", "repoHint": null }

User: "we're getting 504 gateway timeouts on /api/users since the last deploy, here's the nginx log: [error] 28#28: *145 upstream timed out (110: Connection timed out)"
→ { "intent": "bug_report", "issueNumber": null, "taskTitle": null, "taskPriority": null, "repoHint": null }
${projectCtx}

## Rules
- issueNumber: only set for analyze_issue (digits only, no "#").
- taskTitle/taskPriority: only set for create_task. Strip "priority high/medium/low" phrasing out of the title itself. Default taskPriority to "medium" if unstated.
- repoHint: only set when a repo is explicitly named anywhere in the message, for ANY intent. Otherwise null.
- When in doubt between bug_report and general_question: if the message contains ANY actual error output, stack trace, or log line, classify as bug_report.

Respond ONLY with a JSON object matching exactly:
{
  "intent": "analyze_issue" | "create_task" | "bug_report" | "general_question",
  "issueNumber": string | null,
  "taskTitle": string | null,
  "taskPriority": "low" | "medium" | "high" | null,
  "repoHint": string | null
}`;

    return completeJson<IntentClassification>(system, messageText);
  },

  /**
   * Used for "analyze_issue". issueContext is a compact plaintext summary
   * of the GitHub issue; repoCode (optional) is real file content from
   * the resolved repo, keyword-matched against the issue — this is what
   * turns a generic diagnosis into one that references actual code.
   */
  analyzeGithubIssue: async (
    issueContext: string,
    projects?: ProjectContext[],
    repoCode?: RepoCodeGrounding | null
  ): Promise<IssueAnalysis> => {
    const projectCtx = buildProjectContextBlock(projects);
    const repoCtx = buildRepoCodeContextBlock(repoCode);

    const system = `You are Aether, an AI engineering teammate posting directly into a Slack thread.
You'll be given a GitHub issue's title, description, labels, and recent comments${repoCode ? ", plus the actual source files most relevant to it" : ""}.

## Your analysis process
1. Read ALL available information before forming a hypothesis.
2. Identify the most specific, likely root cause. ${
      repoCode
        ? "Since real code is provided below, reference the EXACT file paths, function names, and line-level logic shown — do not describe hypothetical code."
        : "Reference exact error messages or configuration values mentioned in the issue when possible."
    }
3. Propose concrete, immediately actionable fix steps a developer can start on right now:
   - ${repoCode ? "Quote or closely paraphrase the actual relevant lines from the provided files, and show the specific change." : "Include actual code snippets, commands, or config changes where feasible."}
   - If the issue mentions a specific technology/framework, tailor the fix to that framework's patterns.
4. NEVER give generic advice like "check your logs" or "review the code" unless nothing more specific is inferable.
5. Score confidence (0-100) honestly:
   - 80-100: root cause is clearly pinpointed${repoCode ? " and confirmed against the actual code" : " from the issue text"}.
   - 50-79: likely root cause but missing some diagnostic info.
   - 20-49: multiple plausible causes; need more info.
   - 0-19: mostly educated guessing.
${projectCtx}${repoCtx}

Respond ONLY with a JSON object, no prose, no markdown fences, matching exactly:
{
  "rootCause": string,
  "recommendedFix": string[],
  "confidence": number
}`;

    return completeJson<IssueAnalysis>(system, issueContext);
  },

  /**
   * Used for "bug_report" — raw error text plus any code the user pasted;
   * repoCode (optional) is real file content keyword-matched against the
   * error, letting Aether point at the actual failing line instead of a
   * generic hypothesis.
   */
  analyzeBugReport: async (
    errorAndCode: string,
    projects?: ProjectContext[],
    repoCode?: RepoCodeGrounding | null
  ): Promise<BugAnalysis> => {
    const projectCtx = buildProjectContextBlock(projects);
    const repoCtx = buildRepoCodeContextBlock(repoCode);

    const system = `You are Aether's bug-analysis engine, replying inline in Slack to a developer who just pasted an error.

## Diagnostic process
1. Parse the error type/exception class, message, and any stack trace to identify the failure point.
2. If a stack trace is present, identify the first application frame (not library/framework internals) — that's usually where the real bug is.
3. ${
      repoCode
        ? "Real source files from the user's repo are provided below. Cross-reference the stack trace / file paths in the error against them, and quote the actual relevant lines rather than guessing what the code looks like."
        : "Cross-reference with the project's tech stack (if known) to give framework-specific advice."
    }
4. Give ONE clear, directly actionable fix. Be specific:
   - BAD: "Check your database connection settings"
   - GOOD: "The ECONNREFUSED on port 5432 means PostgreSQL isn't running or is on a different port. Run \`sudo systemctl start postgresql\` or check your DATABASE_URL env var."
   - BAD: "There might be a null reference"
   - GOOD: "The TypeError at UserList.tsx:42 means \`users\` is undefined when .map() is called. Add a null check: \`(users ?? []).map(...)\` or initialize the state as an empty array."
5. If ambiguous, state your best hypothesis and what additional info would help narrow it down.

## Confidence scoring
- 80-100: error + stack trace${repoCode ? " confirmed against the actual source" : ""} clearly point to one root cause.
- 50-79: error is clear but could have multiple causes; one is most likely.
- 20-49: only a bare error message with little context.
- 0-19: can't meaningfully diagnose from what was provided.
${projectCtx}${repoCtx}

Respond ONLY with a JSON object, no prose, no markdown fences, matching exactly:
{
  "rootCause": string,
  "recommendedFix": string,
  "confidence": number
}`;

    return completeJson<BugAnalysis>(system, errorAndCode);
  },

  /**
   * Daily engineering summary — the model only generates the "insights"
   * and "recommendedAction" lines; the raw stats come straight from
   * counted Slack history, never from the model, so numbers can't be
   * hallucinated.
   */
  generateDailySummaryInsights: async (
    input: DailySummaryInput,
    projects?: ProjectContext[]
  ): Promise<DailySummaryOutput> => {
    const projectCtx = buildProjectContextBlock(projects);

    const system = `You are Aether, summarizing a day of engineering activity for a Slack channel.
You'll be given stats (issues opened/closed, high-priority bug count, tasks completed/overdue) and the titles of the day's top issues.

## Analysis guidelines
1. Look for REAL patterns in the data:
   - Multiple issue titles referencing the same component/module → potential systemic problem.
   - More issues opened than closed → growing backlog.
   - High-priority bugs > 0 → mention them specifically and recommend immediate triage.
   - Overdue tasks > completed tasks → team may be overcommitted.
2. Only flag insights the data ACTUALLY supports. If nothing notable stands out, return an empty insights array — do NOT invent concerns.
3. Each insight should be one specific, actionable sentence.
4. The recommended action must be the SINGLE highest-leverage thing the team should do next:
   - BAD: "Focus on reducing the bug count."
   - GOOD: "Three auth-related issues opened today — schedule a 30-min auth module review to find the common root cause."
${projectCtx}

Respond ONLY with a JSON object, no prose, no markdown fences, matching exactly:
{
  "insights": string[],
  "recommendedAction": string
}`;

    return completeJson<DailySummaryOutput>(system, JSON.stringify(input));
  },

  /**
   * Fallback for "general_question" — free text, not forced into JSON.
   * repoCode (optional) is only fetched by the caller when the user
   * explicitly named a repo, so this stays fast for plain questions.
   */
  answerGeneralQuestion: async (
    messageText: string,
    projects?: ProjectContext[],
    repoCode?: RepoCodeGrounding | null
  ): Promise<string> => {
    const projectCtx = buildProjectContextBlock(projects);
    const repoCtx = buildRepoCodeContextBlock(repoCode);
    const hasContext = (projects && projects.length > 0) || !!repoCode;

    const system = `You are Aether, an AI engineering teammate mentioned directly in a Slack thread.
You are part of the team — not a generic chatbot. Answer like a senior engineer who knows the project.

## Response guidelines
1. Answer directly and concisely — 2-4 sentences for simple questions, more ONLY if the question genuinely requires detail.
2. ${
      hasContext
        ? "You have project/repo context below. Reference the actual tech stack, repo name, and — if real code is included — the exact files/functions shown. Never invent code that isn't in the context."
        : "You have no additional project context — answer from general engineering knowledge. If the question clearly needs project-specific data you don't have, say so plainly in one sentence."
    }
3. For code-related questions:
   - Include short code snippets when they make the answer clearer (use Slack \`\`\` formatting).
   - ${repoCode ? "Prefer quoting the actual code provided below over generic examples." : "Reference framework/library-specific APIs and patterns, not generic pseudocode."}
4. Write like a sharp, knowledgeable teammate replying in Slack: direct, helpful, no filler.
   - No greetings, no sign-offs, no "Great question!" — just answer.
   - Use Slack formatting: *bold* for emphasis, \`code\` for inline code, \`\`\` for blocks.
${projectCtx}${repoCtx}`;

    const response = await groq.chat.completions.create({
      model: MODEL,
      temperature: 0.3,
      max_tokens: 1024,
      messages: [
        { role: "system", content: system },
        { role: "user", content: messageText },
      ],
    });

    return (
      response.choices[0]?.message?.content?.trim() ??
      "I couldn't generate a response for that — try rephrasing?"
    );
  },
};