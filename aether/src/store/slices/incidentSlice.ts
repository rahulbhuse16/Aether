import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  incidentService,
  type Incident,
  type CreateIncidentInput,
  type AnalyzeIncidentInput,
  type IncidentStatus,
  type IncidentSeverity,
} from "../../services/incident";

interface IncidentState {
  incidents: Incident[];
  currentIncident: Incident | null;
  loading: boolean;
  creating: boolean;
  analyzing: boolean;
  error: string | null;
}

const initialState: IncidentState = {
  incidents: [],
  currentIncident: null,
  loading: false,
  creating: false,
  analyzing: false,
  error: null,
};

export const fetchIncidentsForProject = createAsyncThunk(
  "incidents/fetchForProject",
  async (args: { userId: string; projectId: string }) => {
    return await incidentService.getByProject(args.userId, args.projectId);
  }
);

export const fetchIncidentById = createAsyncThunk(
  "incidents/fetchById",
  async (args: { userId: string; incidentId: string }) => {
    return await incidentService.getById(args.userId, args.incidentId);
  }
);

export const createIncident = createAsyncThunk(
  "incidents/create",
  async (args: { userId: string; input: CreateIncidentInput }) => {
    return await incidentService.create(args.userId, args.input);
  }
);

export const updateIncidentStatusSeverity = createAsyncThunk(
  "incidents/updateStatusSeverity",
  async (args: {
    userId: string;
    incidentId: string;
    updates: { status?: IncidentStatus; severity?: IncidentSeverity };
  }) => {
    return await incidentService.updateStatusSeverity(
      args.userId,
      args.incidentId,
      args.updates
    );
  }
);

export const analyzeIncident = createAsyncThunk(
  "incidents/analyze",
  async (args: { userId: string; incidentId: string; input: AnalyzeIncidentInput }) => {
    return await incidentService.analyze(args.userId, args.incidentId, args.input);
  }
);

function upsert(list: Incident[], incident: Incident): Incident[] {
  const idx = list.findIndex((i) => i.id === incident.id);
  if (idx === -1) return [incident, ...list];
  const next = [...list];
  next[idx] = incident;
  return next;
}

const incidentSlice = createSlice({
  name: "incidents",
  initialState,
  reducers: {
    clearCurrentIncident: (state) => {
      state.currentIncident = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchIncidentsForProject.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchIncidentsForProject.fulfilled, (state, action) => {
        state.loading = false;
        state.incidents = action.payload;
      })
      .addCase(fetchIncidentsForProject.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? "Failed to load incidents";
      })

      .addCase(fetchIncidentById.fulfilled, (state, action) => {
        state.currentIncident = action.payload;
        state.incidents = upsert(state.incidents, action.payload);
      })

      .addCase(createIncident.pending, (state) => {
        state.creating = true;
        state.error = null;
      })
      .addCase(createIncident.fulfilled, (state, action) => {
        state.creating = false;
        state.incidents = [action.payload, ...state.incidents];
      })
      .addCase(createIncident.rejected, (state, action) => {
        state.creating = false;
        state.error = action.error.message ?? "Failed to create incident";
      })

      .addCase(updateIncidentStatusSeverity.fulfilled, (state, action) => {
        state.incidents = upsert(state.incidents, action.payload);
        if (state.currentIncident?.id === action.payload.id) {
          state.currentIncident = action.payload;
        }
      })
      .addCase(updateIncidentStatusSeverity.rejected, (state, action) => {
        state.error = action.error.message ?? "Failed to update incident";
      })

      .addCase(analyzeIncident.pending, (state) => {
        state.analyzing = true;
        state.error = null;
      })
      .addCase(analyzeIncident.fulfilled, (state, action) => {
        state.analyzing = false;
        state.incidents = upsert(state.incidents, action.payload);
        if (state.currentIncident?.id === action.payload.id) {
          state.currentIncident = action.payload;
        }
      })
      .addCase(analyzeIncident.rejected, (state, action) => {
        state.analyzing = false;
        state.error = action.error.message ?? "Failed to analyze incident";
      });
  },
});

export const { clearCurrentIncident } = incidentSlice.actions;
export default incidentSlice.reducer;