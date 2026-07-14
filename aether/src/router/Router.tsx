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

const Router = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<PublicRoute />}>
          <Route path="/auth" element={<AuthWrapper />} />
          <Route path="/" element={<Hero />} />
          <Route path="/pricing" element={<Pricing />} />
           <Route path="/forgot-pwd" element={<ForgotPwd />} />
           
        </Route>

        <Route element={<ProtectedRoute />} >
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/chat" element={<RepositoryChat />} />
          <Route path="/reviews" element={<CodeReviews />} />
          <Route path="/docs-generator" element={<DocsGenerator />} />
          <Route path="/meetings" element={<Meetings />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/api-agent" element={<ApiAgent />} />
          <Route path="/bugs" element={<BugFinder />} />
          <Route path="/architecture" element={<ArchitectureGenerator />} />
          <Route path="/deployment" element={<DeploymentAgent />} />
          <Route path="/voice" element={<VoiceEngineer />} />
          <Route path="/planner" element={<TaskPlanner />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default Router;
