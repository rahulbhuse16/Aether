import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { ApiArtifact } from "../types";

interface ApiAgentState {
  swaggerUrl: string;
  artifacts: ApiArtifact[];
  isGenerating: boolean;
}

const initialState: ApiAgentState = {
  swaggerUrl: "https://api.example.com/swagger.json",
  isGenerating: false,
  artifacts: [
    {
      id: "api1",
      name: "API Documentation",
      type: "docs",
      status: "ready",
      preview: "## Users API\n\n### GET /users\nReturns list of users.\n\n### POST /users\nCreates a new user.",
    },
    {
      id: "api2",
      name: "React Query Hooks",
      type: "hooks",
      status: "ready",
      preview: "export function useUsers() {\n  return useQuery({ queryKey: ['users'], queryFn: fetchUsers });\n}",
    },
    {
      id: "api3",
      name: "TypeScript Types",
      type: "types",
      status: "ready",
      preview: "interface User {\n  id: string;\n  email: string;\n  name: string;\n}",
    },
    {
      id: "api4",
      name: "Axios Service",
      type: "service",
      status: "ready",
      preview: "export const userService = {\n  getAll: () => api.get<User[]>('/users'),\n};",
    },
    {
      id: "api5",
      name: "Postman Collection",
      type: "postman",
      status: "ready",
      preview: '{ "info": { "name": "API Collection" }, "item": [...] }',
    },
    {
      id: "api6",
      name: "Test Cases",
      type: "tests",
      status: "ready",
      preview: "describe('Users API', () => {\n  it('should return users', async () => {...});\n});",
    },
  ],
};

const apiAgentSlice = createSlice({
  name: "apiAgent",
  initialState,
  reducers: {
    setSwaggerUrl(state, action: PayloadAction<string>) {
      state.swaggerUrl = action.payload;
    },
    setGenerating(state, action: PayloadAction<boolean>) {
      state.isGenerating = action.payload;
    },
    addArtifact(state, action: PayloadAction<ApiArtifact>) {
      state.artifacts.push(action.payload);
    },
  },
});

export const { setSwaggerUrl, setGenerating, addArtifact } = apiAgentSlice.actions;
export default apiAgentSlice.reducer;
