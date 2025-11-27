import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  isLoggedIn: null, // null = checking, true = logged in, false = not logged in
  loading: true,
  user: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setLoggedIn: (state, action) => {
      state.isLoggedIn = action.payload;
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setUser: (state, action) => {
      state.user = action.payload;
    },
    logout: (state) => {
      state.isLoggedIn = false;
      state.user = null;
      localStorage.clear();
    },
  },
});

export const { setLoggedIn, setLoading, setUser, logout } = authSlice.actions;
export default authSlice.reducer;