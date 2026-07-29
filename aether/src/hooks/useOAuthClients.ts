import { useState, useCallback } from "react";
import { oauthService } from "../services/oauth";
import type { OAuthClientSummary, RegisterClientInput } from "../services/oauth";

interface UseOAuthClientsReturn {
  clients: OAuthClientSummary[];
  loading: boolean;
  error: string | null;
  total: number;
  page: number;
  limit: number;
  search: string;
  fetchClients: () => Promise<void>;
  createClient: (input: RegisterClientInput) => Promise<OAuthClientSummary & { clientSecret: string }>;
  updateClient: (clientId: string, input: Partial<RegisterClientInput> & { isActive?: boolean }) => Promise<OAuthClientSummary>;
  toggleClient: (clientId: string) => Promise<OAuthClientSummary>;
  rotateSecret: (clientId: string) => Promise<{ clientSecret: string }>;
  deleteClient: (clientId: string) => Promise<void>;
  setSearch: (search: string) => void;
  setPage: (page: number) => void;
}

export function useOAuthClients(): UseOAuthClientsReturn {
  const [clients, setClients] = useState<OAuthClientSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [search, setSearch] = useState("");

  const fetchClients = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await oauthService.listClients(search, page, limit);
      setClients(result.clients);
      setTotal(result.total);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to fetch clients";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [search, page, limit]);

  const createClient = useCallback(async (input: RegisterClientInput) => {
    setError(null);
    try {
      const result = await oauthService.registerClient(input);
      const list = await oauthService.listClients(search, page, limit);
      setClients(list.clients);
      setTotal(list.total);
      return result;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to create client";
      setError(message);
      throw err;
    }
  }, [search, page, limit]);

  const updateClient = useCallback(async (clientId: string, input: Partial<RegisterClientInput> & { isActive?: boolean }) => {
    setError(null);
    try {
      const result = await oauthService.updateClient(clientId, input);
      setClients((current) =>
        current.map((client) => (client.id === clientId ? result : client))
      );
      return result;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update client";
      setError(message);
      throw err;
    }
  }, []);

  const toggleClient = useCallback(async (clientId: string) => {
    setError(null);
    try {
      const result = await oauthService.toggleClientActive(clientId);
      setClients((current) =>
        current.map((client) => (client.id === clientId ? result : client))
      );
      return result;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to toggle client";
      setError(message);
      throw err;
    }
  }, []);

  const rotateSecret = useCallback(async (clientId: string) => {
    setError(null);
    try {
      return await oauthService.rotateClientSecret(clientId);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to rotate secret";
      setError(message);
      throw err;
    }
  }, []);

  const deleteClient = useCallback(async (clientId: string) => {
    setError(null);
    try {
      await oauthService.deleteClient(clientId);
      const list = await oauthService.listClients(search, page, limit);
      setClients(list.clients);
      setTotal(list.total);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to delete client";
      setError(message);
      throw err;
    }
  }, [search, page, limit]);

  return {
    clients,
    loading,
    error,
    total,
    page,
    limit,
    search,
    fetchClients,
    createClient,
    updateClient,
    toggleClient,
    rotateSecret,
    deleteClient,
    setSearch,
    setPage,
  };
}
