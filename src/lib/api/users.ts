import { api } from "./client";
import type { CreateUserInput, Role, SuccessResponse, UpdateUserInput, User } from "./types";

export const usersApi = {
  list: (query?: { role?: Role; active?: boolean }) => api.get<User[]>("/users", query),
  create: (data: CreateUserInput) => api.post<User>("/users", data),
  update: (id: string, data: UpdateUserInput) => api.patch<User>(`/users/${id}`, data),
  remove: (id: string) => api.delete<SuccessResponse>(`/users/${id}`),
};
