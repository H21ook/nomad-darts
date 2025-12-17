import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";

// Define a type for the slice state
interface AuthState {
  accessToken?: string;
}

// Define the initial state using that type
const initialState: AuthState = {
  accessToken: undefined,
};

export const authSlice = createSlice({
  name: "counter",
  initialState,
  reducers: {
    setAccessToken: (state, action: PayloadAction<string>) => {
      state.accessToken = action.payload;
    },
    clearToken: (state) => {
      state.accessToken = undefined;
    },
  },
});

export const { setAccessToken, clearToken } = authSlice.actions;

export const selectAccessToken = (state: AuthState) => state.accessToken;

export default authSlice.reducer;
