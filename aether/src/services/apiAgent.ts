import axios, { AxiosError } from "axios";
import type { ApiArtifact } from "../store/types";

const API_BASE = "https://aether-api-y0ob.onrender.com/api/v1";

interface GenerateResponse {
  success: boolean;
  message?: string;
  specTitle?: string;
  artifacts?: ApiArtifact[];
}

interface RegenerateResponse {
  success: boolean;
  message?: string;
  artifact?: ApiArtifact;
  artifacts?: ApiArtifact[];
}

interface LatestSessionResponse {
  success: boolean;
  session: {
    id: string;
    swaggerUrl: string;
    specTitle: string | null;
    artifacts: ApiArtifact[];
    updatedAt: string;
  } | null;
  message?: string;
}

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    "Content-Type": "application/json",
  },
});

const handleError = (error: unknown): never => {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<{
      success?: boolean;
      message?: string;
    }>;

    throw new Error(
      axiosError.response?.data?.message ||
        axiosError.message ||
        "Something went wrong"
    );
  }

  throw new Error("Unexpected error occurred");
};

export const apiAgentApi = {
  async generate(swaggerUrl: string) {
    try {
      const { data } = await api.post<GenerateResponse>(
        "/api-agent/generate",
        {
          swaggerUrl,
        }
      );

      if (!data.success) {
        throw new Error(data.message || "Generation failed");
      }

      return data;
    } catch (error) {
      handleError(error);
    }
  },

  async regenerate(
    swaggerUrl: string,
    type: ApiArtifact["type"]
  ) {
    try {
      const { data } = await api.post<RegenerateResponse>(
        "/api-agent/regenerate",
        {
          swaggerUrl,
          type,
        }
      );

      if (!data.success) {
        throw new Error(data.message || "Regeneration failed");
      }

      return data;
    } catch (error) {
      handleError(error);
    }
  },

  async latest(swaggerUrl: string){
    try {
      const { data } = await api.get<LatestSessionResponse>(
        "/api-agent/latest",
        {
          params: {
            swaggerUrl,
          },
        }
      );

      if (!data.success) {
        throw new Error(data.message || "Failed to fetch latest session");
      }

      return data;
    } catch (error) {
      handleError(error);
    }
  },
};