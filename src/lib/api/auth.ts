import { api, apiRequest } from "./client";
import type { AuthResponse, SuccessResponse, User } from "./types";

export const authApi = {
  login: (email: string, password: string) =>
    apiRequest<AuthResponse>("/auth/login", { method: "POST", body: { email, password }, auth: false }),
  logout: (refreshToken: string) => api.post<SuccessResponse>("/auth/logout", { refreshToken }),
  me: () => api.get<User>("/auth/me"),
};
