import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./slices/authSlice";
import projectsReducer from "./slices/projectsSlice";
import tasksReducer from "./slices/tasksSlice";
import uiReducer from "./slices/uiSlice";
import budgetReducer from "./slices/budgetSlice";
import chatReducer from "./slices/chatSlice";
import reviewsReducer from "./slices/reviewsSlice";
import meetingsReducer from "./slices/meetingsSlice";
import docsReducer from "./slices/docsSlice";
import deploymentReducer from "./slices/deploymentSlice";
import apiAgentReducer from "./slices/apiAgentSlice";
import bugsReducer from "./slices/bugsSlice";
import architectureReducer from "./slices/architectureSlice";
import voiceReducer from "./slices/voiceSlice";
import integrationsReducer from "./slices/integrationsSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    projects: projectsReducer,
    tasks: tasksReducer,
    ui: uiReducer,
    budget: budgetReducer,
    chat: chatReducer,
    reviews: reviewsReducer,
    meetings: meetingsReducer,
    docs: docsReducer,
    deployment: deploymentReducer,
    apiAgent: apiAgentReducer,
    bugs: bugsReducer,
    architecture: architectureReducer,
    voice: voiceReducer,
    integrations: integrationsReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
