import { api } from "./client";
import type { Restaurant, UpdateRestaurantInput } from "./types";

export const restaurantApi = {
  get: () => api.get<Restaurant>("/restaurant"),
  update: (data: UpdateRestaurantInput) => api.patch<Restaurant>("/restaurant", data),
};
