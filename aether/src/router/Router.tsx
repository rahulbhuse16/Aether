import { BrowserRouter, Routes, Route } from "react-router-dom";
import PublicRoute from "../routes/PublicRoute";
import ProtectedRoute from "../routes/ProtectedRoute";
import AuthWrapper from "../pages/AuthWrapper";
import Hero from "../pages/Hero";
import Pricing from "../pages/Pricing";
import Dashboard from "../pages/DashBoard";
import RepositoryChat from "../pages/RepositoryChat";
import CodeReviews from "../pages/CodeReviews";
import DocsGenerator from "../pages/DocsGenerator";
import Meetings from "../pages/Meetings";
import Settings from "../pages/Settings";
import ApiAgent from "../pages/ApiAgent";
import BugFinder from "../pages/BugFinder";
import ArchitectureGenerator from "../pages/ArchitectureGenerator";
import DeploymentAgent from "../pages/DeploymentAgent";
import VoiceEngineer from "../pages/VoiceEngineer";
import TaskPlanner from "../pages/TaskPlanner";
import Onboarding from "../pages/Onboarding";
import ForgotPwd from "../pages/ForgotPwd";
import OAuthCallback from "../pages/OAuthCallback";
import Slack from "../pages/Slack";
import SlackChat from "../pages/SlackChat";
import AetherActivity from "../pages/SlackSync";
import Calendar from "../pages/Calendar";
import Notion from "../pages/Notion";
import NotFoundPage from "../pages/NotFound";
import NotificationSettings from "../pages/NotificationSettings";
import SecuritySettings from "../pages/SecuritySettings";
import GitHubPermissions from "../pages/GitHubPermissions";
import Incidents from "../pages/Incident";
import Consent from "../pages/Consent";
import OAuthClients from "../pages/OAuthClients";
import LiveWalkthroughPage from "../pages/LiveWalkthroughPage";

const Router = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="*" element={<NotFoundPage />} />
        <Route path="/oauth/callback" element={<OAuthCallback />} />
        <Route path="/oauth/consent/:requestId" element={<Consent />} />
        <Route path="/live-workflow" element={<LiveWalkthroughPage />} />



        <Route element={<PublicRoute />}>
          <Route path="/auth" element={<AuthWrapper />} />
          <Route path="/" element={<Hero />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/reset-password" element={<ForgotPwd />} />



        </Route>

        <Route element={<ProtectedRoute />} >
          <Route path="/reset-password" element={<ForgotPwd />} />

          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/chat" element={<RepositoryChat />} />
          <Route path="/reviews" element={<CodeReviews />} />
          <Route path="/docs-generator" element={<DocsGenerator />} />
          <Route path="/meetings" element={<Meetings />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/settings/notifications" element={<NotificationSettings />} />
          <Route path="/settings/security" element={<SecuritySettings />} />
          <Route path="/settings/security/oauth" element={<OAuthClients />} />

          <Route path="/settings/github" element={<GitHubPermissions />} />
          <Route path="/api-agent" element={<ApiAgent />} />
          <Route path="/bugs" element={<BugFinder />} />
          <Route path="/architecture" element={<ArchitectureGenerator />} />
          <Route path="/deployment" element={<DeploymentAgent />} />
          <Route path="/voice" element={<VoiceEngineer />} />
          <Route path="/planner" element={<TaskPlanner />} />
          <Route path="/slack" element={<Slack />} />
          <Route path="/slack-chat" element={<SlackChat />} />
          <Route path="/slack-ai" element={<AetherActivity />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/notion" element={<Notion />} />
          <Route path="/incidents" element={<Incidents />} />

        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default Router;
