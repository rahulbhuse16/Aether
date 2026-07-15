import type { Response, Request } from "express";
import Groq from "groq-sdk";
import { ENV } from "../config/env";
import { Project } from "../models/project";
import { User } from "../models/user";
import axios from "axios";

const groq = new Groq({ apiKey: ENV.GROQ_API_KEY });
const GROQ_MODEL = "llama-3.3-70b-versatile";

interface LLMFinding {
  line: number;
  category: "bug" | "performance" | "security" | "style";
  message: string;
  suggestion: string;
}

interface LLMOutput {
  findings: LLMFinding[];
}

const SYSTEM_PROMPT = `
You are Aether Code Review AI, a senior software engineer with expertise in TypeScript, JavaScript, React, React Native, Node.js, Express, Python, Java, Go, C#, databases, cloud infrastructure, security, and software architecture.

You are reviewing a Git Pull Request using Unified Diff (git patch) format.

Your responsibility is to review ONLY the changed lines shown in the diff.

Your objective is to identify REAL issues that should be fixed before merging.

Review for:

• Bugs
  - Incorrect logic
  - Null/undefined access
  - Race conditions
  - Async mistakes
  - Missing error handling
  - Resource leaks
  - Edge cases
  - Incorrect state updates
  - Breaking existing functionality

• Performance
  - Unnecessary renders
  - Expensive computations
  - Duplicate API calls
  - Memory leaks
  - O(n²) algorithms
  - Inefficient database queries
  - Missing memoization where appropriate

• Security
  - Hardcoded secrets
  - Authentication issues
  - Authorization flaws
  - Injection vulnerabilities
  - Unsafe HTML rendering
  - Sensitive data exposure
  - Insecure cryptography
  - Missing validation

• Maintainability
  - Dead code
  - Duplicate logic
  - Poor naming
  - Unreachable code
  - Overly complex implementations
  - Missing error handling
  - Code that is difficult to maintain

Instructions:

- Review ONLY the modified code.
- Do NOT comment on unchanged code.
- Do NOT invent issues.
- Do NOT make style suggestions unless they improve readability or maintainability.
- Ignore formatting and linting unless they hide a real problem.
- Every finding must be supported by evidence from the diff.
- Suggestions must be technically correct and safe.
- If uncertain, do not report the issue.
- Prefer fewer high-confidence findings over many speculative ones.

For every issue include:

- line: line number in the diff
- category:
  - bug
  - performance
  - security
  - style
- severity:
  - low
  - medium
  - high
  - critical
- confidence:
  - low
  - medium
  - high
- message:
  A concise explanation describing the issue and why it matters.
- suggestion:
  A concrete fix or replacement.

Return ONLY valid JSON.

Schema:

{
  "findings": [
    {
      "line": 42,
      "category": "bug",
      "severity": "high",
      "confidence": "high",
      "message": "Possible null dereference because user may be undefined before accessing user.id.",
      "suggestion": "Check that user exists before accessing its properties."
    }
  ]
}

If there are no issues, return:

{
  "findings": []
}

Do not include markdown.
Do not include explanations outside the JSON.
Output must always be valid JSON.
`;

export async function runCodeReview(req: Request, res: Response) {
  const { projectId, prNumber, userId } = req.body as {
    projectId?: string;
    prNumber?: number;
    userId?: string;
  };

  if (!userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  if (!projectId || prNumber === undefined) {
    return res.status(400).json({ error: "Missing projectId or prNumber" });
  }

  try {
    const project = await Project.findOne({ _id: projectId, owner: userId });
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    const user = await User.findById(userId).select("+githubAccessToken");
    if (!user?.githubAccessToken) {
      return res.status(409).json({ error: "GitHub account not connected" });
    }

    // Fetch PR changed files & diffs
    const { data: files } = await axios.get(
      `https://api.github.com/repos/${project.repo}/pulls/${prNumber}/files`,
      {
        headers: {
          Authorization: `Bearer ${user.githubAccessToken}`,
          Accept: "application/vnd.github+json",
        },
      }
    );

    // Format the files context for input
    const formattedFiles = files.map((file: any) => ({
      filename: file.filename,
      status: file.status,
      patch: file.patch || "No diff/patch content available (binary or empty file)"
    }));

    // Call Groq
    const completion = await groq.chat.completions.create({
      model: GROQ_MODEL,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: JSON.stringify({ repo: project.repo, prNumber, files: formattedFiles }) },
      ],
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) {
      throw new Error("Empty response from Groq");
    }

    const result = JSON.parse(raw) as LLMOutput;
    
    // Normalize and add unique ids to findings
    const findings = (result.findings || []).map((finding, idx) => ({
      id: `f-${Date.now()}-${idx}`,
      line: Number(finding.line) || 1,
      category: ["bug", "performance", "security", "style"].includes(finding.category)
        ? finding.category
        : "style",
      message: finding.message,
      suggestion: finding.suggestion
    }));

    return res.json({ findings });
  } catch (err: any) {
    console.error("runCodeReview failed:", err);
    return res.status(502).json({ error: err.message || "Failed to analyze PR" });
  }
}
