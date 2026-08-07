import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  GitBranch,
  MessageSquare,
  Shield,
  Network,
  Layout,
  Zap,
  Layers,
  Rocket,
  BarChart3,
  Settings,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  X,
} from "lucide-react";

// Components
import Sidebar from "../components/walkthrough/Sidebar";
import MainWorkspace from "../components/walkthrough/MainWorkspace";
import AIPanel from "../components/walkthrough/AIPanel";
import NotificationCenter from "../components/walkthrough/NotificationCenter";

// Scenes
import Scene1_RepositoryConnected from "../components/walkthrough/scenes/Scene1_RepositoryConnected";
import Scene2_UnderstandingCodebase from "../components/walkthrough/scenes/Scene2_UnderstandingCodebase";
import Scene3_ChatWithRepository from "../components/walkthrough/scenes/Scene3_ChatWithRepository";
import Scene4_BugDetection from "../components/walkthrough/scenes/Scene4_BugDetection";
import Scene5_AICodeReview from "../components/walkthrough/scenes/Scene5_AICodeReview";
import Scene6_ArchitectureGenerator from "../components/walkthrough/scenes/Scene6_ArchitectureGenerator";
import Scene7_SlackIntegration from "../components/walkthrough/scenes/Scene7_SlackIntegration";
import Scene8_NotionIntegration from "../components/walkthrough/scenes/Scene8_NotionIntegration";
import Scene9_Deployment from "../components/walkthrough/scenes/Scene9_Deployment";
import Scene10_DeveloperDashboard from "../components/walkthrough/scenes/Scene10_DeveloperDashboard";
import HeroHeader from "../components/walkthrough/Header";

const SCENE_DURATION = 5000; // 5 seconds per scene
const TOTAL_SCENES = 10;

type SceneType = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

const NAVIGATION_ITEMS = [
  { id: "dashboard", icon: BarChart3, label: "Dashboard" },
  { id: "repositories", icon: GitBranch, label: "Repositories" },
  { id: "ai-chat", icon: MessageSquare, label: "AI Chat" },
  { id: "code-review", icon: Shield, label: "Code Review" },
  { id: "architecture", icon: Network, label: "Architecture" },
  { id: "slack", icon: Layout, label: "Slack" },
  { id: "notion", icon: Layers, label: "Notion" },
  { id: "deployments", icon: Rocket, label: "Deployments" },
  { id: "settings", icon: Settings, label: "Settings" },
];

export default function LiveWalkthroughPage() {
  const [currentScene, setCurrentScene] = useState<SceneType>(1);
  const [activeNav, setActiveNav] = useState("repositories");
  const [notifications, setNotifications] = useState<Array<{
    id: string;
    type: "success" | "warning" | "info";
    message: string;
  }>>([]);

  const[showHeader,setShowHeader]=useState(true)


  useEffect(()=>{
    setTimeout(()=>{
      setShowHeader(false)
    },3000)

  },[])





  // Scene transition logic
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentScene((prev) => {
        if (prev >= TOTAL_SCENES) return 1;
        return (prev + 1) as SceneType;
      });
    }, SCENE_DURATION);

    return () => clearInterval(interval);
  }, []);

  // Update active navigation based on scene
  useEffect(() => {
    const navMap: Record<SceneType, string> = {
      1: "repositories",
      2: "repositories",
      3: "ai-chat",
      4: "code-review",
      5: "code-review",
      6: "architecture",
      7: "slack",
      8: "notion",
      9: "deployments",
      10: "dashboard",
    };
    if(!showHeader)
    setActiveNav(navMap[currentScene]);
  }, [currentScene]);

  // Notification system
  useEffect(() => {
    const notificationMap: Record<SceneType, { type: "success" | "warning" | "info"; message: string } | null> = {
      1: { type: "success", message: "Repository synchronized successfully" },
      2: { type: "success", message: "Codebase fully indexed" },
      3: null,
      4: { type: "warning", message: "3 security issues detected" },
      5: { type: "success", message: "PR approved by AI" },
      6: { type: "success", message: "Architecture diagram generated" },
      7: { type: "info", message: "Slack message summarized" },
      8: { type: "success", message: "Documentation updated" },
      9: { type: "success", message: "Deployment successful" },
      10: null,
    };

    const notification = notificationMap[currentScene];
    if (notification) {
      const id = Date.now().toString();
      setNotifications((prev) => [...prev, { id, ...notification }]);
      setTimeout(() => {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
      }, 3000);
    }
  }, [currentScene]);

  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const renderScene = () => {
    switch (currentScene) {
      case 1:
        return <Scene1_RepositoryConnected />;
      case 2:
        return <Scene2_UnderstandingCodebase />;
      case 3:
        return <Scene3_ChatWithRepository />;
      case 4:
        return <Scene4_BugDetection />;
      case 5:
        return <Scene5_AICodeReview />;
      case 6:
        return <Scene6_ArchitectureGenerator />;
      case 7:
        return <Scene7_SlackIntegration />;
      case 8:
        return <Scene8_NotionIntegration />;
      case 9:
        return <Scene9_Deployment />;
      case 10:
        return <Scene10_DeveloperDashboard />;
      default:
        return <Scene1_RepositoryConnected />;
    }
  };

  if(showHeader){
    return <HeroHeader/>
  }

  return (
  <div className="relative min-h-screen overflow-hidden bg-[#05070B] text-white">
    {/* Background */}
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="absolute left-1/4 top-0 h-[500px] w-[500px] rounded-full bg-cyan-500/10 blur-[140px]" />
      <div className="absolute right-1/4 bottom-0 h-[500px] w-[500px] rounded-full bg-violet-500/10 blur-[160px]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.05),transparent_60%)]" />
    </div>

    {/* Hero */}

    {/* Workspace */}
    <div className="relative z-10 flex h-[calc(100vh-220px)] overflow-hidden">
      <Sidebar
        activeNav={activeNav}
        navItems={NAVIGATION_ITEMS}
      />

      <MainWorkspace>
        <AnimatePresence mode="wait">
          <motion.div
            key={currentScene}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.45 }}
            className="h-full"
          >
            {renderScene()}
          </motion.div>
        </AnimatePresence>
      </MainWorkspace>

      <AIPanel currentScene={currentScene} />
    </div>

    {/* Notifications */}
    <NotificationCenter
      notifications={notifications}
      onRemove={removeNotification}
    />

    {/* Progress */}
    <div className="fixed bottom-8 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 backdrop-blur-xl">
      {Array.from({ length: TOTAL_SCENES }).map((_, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0.4 }}
          animate={{
            width: currentScene === index + 1 ? 34 : 8,
            opacity: currentScene === index + 1 ? 1 : 0.35,
          }}
          transition={{
            duration: 0.35,
          }}
          className={`h-2 rounded-full ${
            currentScene === index + 1
              ? "bg-gradient-to-r from-cyan-400 to-violet-500"
              : "bg-white/20"
          }`}
        />
      ))}
    </div>
  </div>
);
  
}
