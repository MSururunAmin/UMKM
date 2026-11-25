import { describe, expect, it, vi } from "vitest";
import axios from "axios";
import type { AxiosAdapter, AxiosResponse, InternalAxiosRequestConfig } from "axios";

const authState = vi.hoisted(() => ({
  token: null as string | null,
  clearSession: () => undefined,
}));

vi.mock("@/store/auth-store", () => ({
  useAuthStore: { getState: () => authState },
}));

const { api } = await import("./api");

describe("API authentication", () => {
  it("clears the stored session after an authenticated request returns 401", async () => {
    authState.token = "expired-token";
    authState.clearSession = () => {
      authState.token = null;
    };

    const adapter: AxiosAdapter = async (config: InternalAxiosRequestConfig) => {
      const response: AxiosResponse = {
        data: { message: "Unauthenticated." },
        status: 401,
        statusText: "Unauthorized",
        headers: {},
        config,
      };

      throw new axios.AxiosError("Request failed with status code 401", "ERR_BAD_REQUEST", config, undefined, response);
    };

    await expect(api.get("/customer/orders", { adapter })).rejects.toMatchObject({
      response: { status: 401 },
    });
    expect(authState.token).toBeNull();
  });
});
