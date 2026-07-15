export interface User {
  name: string;
  email: string;
  avatarUrl?: string;
  githubToken?:string;
  userId ?: string;
  
}

export interface Project {
  id: string;
  name: string;
  repo: string;
  openTasks: number;
  lastActivity: string;
  projectId : string
}

export interface Task {
  id: string;
  title: string;
  status: "open" | "in_progress" | "done";
  source: "github" | "jira" | "ai";
  priority?: "low" | "medium" | "high";
  dueDate?: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  sources?: string[];
  suggestions?: string[];
}

export interface ReviewFinding {
  id: string;
  line: number;
  category: "bug" | "performance" | "security" | "style";
  message: string;
  suggestion: string;
}

export interface PullRequest {
  id: string;
  number: number;
  title: string;
  author: string;
  status: "open" | "merged" | "closed";
  findings?: ReviewFinding[];
  reviewed: boolean;
}

export interface Meeting {
  id: string;
  title: string;
  date: string;
  duration: string;
  status: "processing" | "ready";
  actionItems: string[];
  summary?: string;
}

export interface GeneratedDoc {
  id: string;
  title: string;
  type: "readme" | "api" | "architecture" | "flow";
  status: "generating" | "ready";
  preview: string;
}

export interface DeploymentArtifact {
  id: string;
  name: string;
  type: "dockerfile" | "nginx" | "github-actions" | "kubernetes";
  content: string;
}

export interface ApiArtifact {
  id: string;
  name: string;
  type: "docs" | "hooks" | "types" | "service" | "postman" | "tests";
  status: "ready" | "generating" | string;
  preview: string;
  content:any
}

export interface BugReport {
  id: string;
  title: string;
  severity: "critical" | "high" | "medium" | "low";
  rootCause: string;
  fix: string;
  stackTrace: string;
}

export interface ArchitectureNode {
  id: string;
  label: string;
  type: "frontend" | "gateway" | "service" | "database" | "cache" | "queue";
}

export interface VoiceCommand {
  id: string;
  transcript: string;
  status: "pending" | "building" | "complete";
  output?: string;
}

export interface Integration {
  id: string;
  name: string;
  type: "github" | "jira" | "slack" | "google" | "notion";
  connected: boolean;
  lastSync?: string;
}
