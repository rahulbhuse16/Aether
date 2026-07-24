import { motion } from "framer-motion";
import {
  Link2,
  User,
  Bell,
  Shield,
  Gauge,
  CheckCircle2,
} from "lucide-react";
import { FaGithub, FaJira, FaSlack, FaGoogle, FaRegStickyNote } from "react-icons/fa";
import { AppShell } from "../components/AppShell";
import { GlassCard } from "../components/ui/GlassCard";
import { PageSection } from "../components/ui/PageSection";
import { Button } from "../components/ui/Button";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { setBudgetUsed } from "../store/slices/budgetSlice";
import type { Integration } from "../store/types";
import { API_BASE } from "../constants/constants";
import { useEffect } from "react";
import { loadUser } from "../services/auth";
import { setIntegrationState } from "../store/slices/integrationsSlice";
import { timeAgo } from "../utils/helper";
import api from "../api/api";

const INTEGRATION_ICONS: Record<Integration["type"], React.ComponentType<{ className?: string }>> = {
  github: FaGithub,
  jira: FaJira,
  slack: FaSlack,
  google: FaGoogle,
  notion: FaRegStickyNote,
};

export default function Settings() {
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const integrations = useAppSelector((s) => s.integrations.integrations);
  const budget = useAppSelector((s) => s.budget);
  const userId = localStorage.getItem("userId") as string;



  const loadIntegrations = async () => {

  if (!userId) return;

  try {
    const response = await api.get(`/auth/user/${userId}`);

    const data = response.data.user;

    dispatch(
      setIntegrationState({
        github: {
          connected: Boolean(data?.githubConnected),
          lastSync: undefined,
        },

        jira: {
          connected: false,
          lastSync: undefined,
        },

        slack: {
          connected: Boolean(data?.slack?.connected),
          lastSync: data?.slack?.lastSyncAt
            ? timeAgo(data.slack.lastSyncAt)
            : undefined,
        },

        google: {
          connected: Boolean(data?.googleCalendar?.connected),
          lastSync: data?.googleCalendar?.lastSyncAt
            ? timeAgo(data.googleCalendar.lastSyncAt)
            : undefined,
        },

        notion: {
          connected: Boolean(data?.notion?.connected),
          lastSync: data?.notion?.lastSyncAt
            ? timeAgo(data.notion.lastSyncAt)
            : undefined,
        },
      })
    );
  } catch (error) {
    console.error("loadIntegrations error:", error);
  }
};




 useEffect(() => {
  console.log("Settings effect started");
  loadIntegrations();

  
}, []);



  const handleIntegration=(i :Integration)=>{
    if(i.type==='google'){
            window.location.href = `${API_BASE}/calendar/connect?userId=${userId}`;
      

    }
    else if(i.type==='slack'){
      window.location.href = `${API_BASE}/slack/connect?userId=${userId}`;

    }
    else if(i.type==='notion'){
      window.location.href = `${API_BASE}/notion/connect?userId=${userId}`;

    }

  }

  console.log("i",integrations)

  return (
    <AppShell title="Settings">
      <div className="mx-auto max-w-3xl space-y-8">
        <PageSection label="Profile" title="Account settings">
          <GlassCard>
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[#8B7FE8] to-[#22A67D] text-[18px] font-medium text-[#0A0B0D]">
                {user?.name?.[0] ?? "U"}
              </div>
              <div className="flex-1">
                <p className="text-[15px] font-medium text-[#F4F3EF]">{user?.name}</p>
                <p className="text-[13px] text-[#94969E]">{user?.email}</p>
              </div>
              <Button size="sm">
                <User className="h-3.5 w-3.5" />
                Edit profile
              </Button>
            </div>
          </GlassCard>
        </PageSection>

        <PageSection label="Integrations" title="Connected services" delay={0.05}>
          <div className="space-y-2">
            {integrations.map((integration, i) => {
              const Icon = INTEGRATION_ICONS[integration.type];
              return (
                <motion.div
                  key={integration.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.04 * i }}
                  onClick={()=>{
                    handleIntegration(i)
                  }}
                >
                  <GlassCard onclick={()=>{
                    handleIntegration(i)
                  }}  className="flex items-center justify-between py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03]">
                        <Icon className="h-4 w-4 text-[#F4F3EF]" />
                      </div>
                      <div>
                        <p className="text-[14px] font-medium text-[#F4F3EF]">
                          {integration.name}
                        </p>
                        {integration.connected && integration.lastSync && (
                          <p className="text-[11px] text-[#55575F]">
                            Last sync: {integration.lastSync}
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleIntegration(integration)}
                      className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] transition-colors ${
                        integration.connected
                          ? "bg-[#22A67D]/15 text-[#22A67D]"
                          : "bg-white/[0.04] text-[#94969E] hover:text-[#F4F3EF]"
                      }`}
                    >
                      {integration.connected ? (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Connected
                        </>
                      ) : (
                        <>
                          <Link2 className="h-3.5 w-3.5" />
                          Connect
                        </>
                      )}
                    </button>
                  </GlassCard>
                </motion.div>
              );
            })}
          </div>
        </PageSection>

        <PageSection label="AI budget" title="Cost governor" delay={0.1}>
          <GlassCard highlight>
            <div className="mb-4 flex items-center gap-2">
              <Gauge className="h-4 w-4 text-[#22A67D]" />
              <span className="text-[14px] font-medium text-[#F4F3EF]">
                Monthly AI usage: {budget.used}%
              </span>
            </div>
            <div className="mb-4 h-2 overflow-hidden rounded-full bg-white/[0.08]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#8B7FE8] to-[#22A67D]"
                style={{ width: `${budget.used}%` }}
              />
            </div>
            <p className="mb-4 text-[12.5px] text-[#94969E]">
              Set limits to prevent runaway AI costs. Alerts trigger at 80% and 95%.
            </p>
            <div className="flex gap-2">
              {[50, 75, 90].map((val) => (
                <Button
                  key={val}
                  size="sm"
                  onClick={() => dispatch(setBudgetUsed(val))}
                  className={budget.used === val ? "border-[#8B7FE8]/40" : ""}
                >
                  {val}%
                </Button>
              ))}
            </div>
          </GlassCard>
        </PageSection>

        <PageSection label="Preferences" delay={0.15}>
          <div className="space-y-2">
            {[
              { icon: Bell, label: "Notifications", desc: "PR reviews, meeting summaries, AI alerts" },
              { icon: Shield, label: "Security", desc: "Two-factor auth, API keys, session management" },
              { icon: FaGithub, label: "GitHub permissions", desc: "Repo access, PR webhooks, commit analysis" },
            ].map((item) => (
              <GlassCard key={item.label} className="flex items-center justify-between py-4">
                <div className="flex items-center gap-3">
                  <item.icon className="h-4 w-4 text-[#94969E]" />
                  <div>
                    <p className="text-[14px] text-[#F4F3EF]">{item.label}</p>
                    <p className="text-[12px] text-[#55575F]">{item.desc}</p>
                  </div>
                </div>
                <Button size="sm" variant="ghost">
                  Configure
                </Button>
              </GlassCard>
            ))}
          </div>
        </PageSection>
      </div>
    </AppShell>
  );
}
