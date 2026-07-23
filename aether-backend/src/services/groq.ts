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
 * Shared helper: one narrow system prompt per job, forced JSON output, low
 * temperature. Aether is replying inline in a live Slack thread — an
 * off-format or rambling response breaks the bot, so structure is
 * non-negotiable here, not a nice-to-have.
 */
async function completeJson<T>(system: string, user: string): Promise<T> {
  const response = await groq.chat.completions.create({
    model: MODEL,
    temperature: 0.2,
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
   * First step for every @Aether mention: decide what the person actually
   * wants before doing any work, so a random question doesn't trigger a
   * GitHub lookup or a task getting silently created.
   */
  classifyMention: async (messageText: string): Promise<IntentClassification> => {
    const system = `You are the intent router for Aether, an AI engineering teammate that lives in Slack.
Classify the user's message into exactly one intent:
- "analyze_issue": user wants Aether to look at a specific GitHub issue (usually references a number like #142)
- "create_task": user wants Aether to create a task/todo (phrasing like "create a task", "add a task", "todo:")
- "bug_report": user pasted an error message, stack trace, or log output and wants a root-cause analysis
- "general_question": anything else directed at Aether

Respond ONLY with a JSON object, no prose, no markdown fences, matching exactly this shape:
{
  "intent": "analyze_issue" | "create_task" | "bug_report" | "general_question",
  "issueNumber": string | null,
  "taskTitle": string | null,
  "taskPriority": "low" | "medium" | "high" | null
}
issueNumber is only set for analyze_issue (digits only, no "#").
taskTitle/taskPriority are only set for create_task; strip "priority high/medium/low" phrasing out of the title itself. Default taskPriority to "medium" if the user didn't state one.`;

    return completeJson<IntentClassification>(system, messageText);
  },

  /**
   * Used for "analyze_issue". issueContext is a compact plaintext summary
   * of the GitHub issue (title, body, labels, recent comments) assembled
   * by the caller from Aether's existing GitHub integration.
   */
  analyzeGithubIssue: async (issueContext: string): Promise<IssueAnalysis> => {
    const system = `You are Aether, an AI engineering teammate posting directly into a Slack thread.
You'll be given a GitHub issue's title, description, labels, and recent comments.
Diagnose the most likely root cause and propose concrete, actionable fix steps a developer could start on immediately — never generic advice like "check your logs" unless nothing more specific is inferable from what's given.
Score your own confidence (0-100) honestly based on how much the issue text actually supports your diagnosis; do not inflate it.

Respond ONLY with a JSON object, no prose, no markdown fences, matching exactly:
{
  "rootCause": string,
  "recommendedFix": string[],
  "confidence": number
}`;

    return completeJson<IssueAnalysis>(system, issueContext);
  },

  /**
   * Used for "bug_report" — raw error text plus any code the user pasted
   * alongside it in the same Slack message.
   */
  analyzeBugReport: async (errorAndCode: string): Promise<BugAnalysis> => {
    const system = `You are Aether's bug finder, replying inline in Slack to a developer who just pasted an error.
Identify the single most likely root cause and give one clear, directly actionable fix — a config change, a code change, or a command to run. Prefer one confident answer over a list of possibilities; a Slack thread wants a fast, decisive read, not a diagnostic checklist.
Score confidence (0-100) based on how much diagnostic information was actually provided — low if it's just a bare error with no code or stack trace.

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
   * and "recommendedAction" lines; the raw stats come straight from the
   * database, never from the model, so numbers can't be hallucinated.
   */
  generateDailySummaryInsights: async (
    input: DailySummaryInput
  ): Promise<DailySummaryOutput> => {
    const system = `You are Aether, summarizing a day of engineering activity for a Slack channel.
You'll be given stats (issues opened/closed, high-priority bug count, tasks completed/overdue) and the titles of the day's top issues.
Flag 1-2 genuinely notable patterns or risks — only if the data actually supports it (e.g. several similar issue titles clustering around one area, an unusually high overdue count). If nothing stands out, return an empty insights array rather than inventing a concern.
Then give exactly one recommended action: the single highest-leverage thing the team should look at next.

Respond ONLY with a JSON object, no prose, no markdown fences, matching exactly:
{
  "insights": string[],
  "recommendedAction": string
}`;

    return completeJson<DailySummaryOutput>(system, JSON.stringify(input));
  },

  /**
   * Fallback for "general_question" — free text, not forced into JSON,
   * since it's posted back into Slack as a normal chat reply.
   */
  answerGeneralQuestion: async (
    messageText: string,
    contextSummary?: string
  ): Promise<string> => {
    const system = `You are Aether, an AI engineering teammate mentioned directly in a Slack thread.
Answer the developer's question directly and concisely — 2-4 sentences unless it genuinely needs more.
${
    contextSummary
        ? `Relevant context available to you:\n${contextSummary}`
        : "You have no additional project context for this question beyond the message itself — answer from general engineering knowledge, and say so plainly if the question needs project-specific data you don't have."
}
Write like a sharp, terse teammate replying in Slack, not a formal assistant. No greetings, no sign-offs.`;

    const response = await groq.chat.completions.create({
      model: MODEL,
      temperature: 0.4,
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