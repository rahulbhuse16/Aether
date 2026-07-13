import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

interface BudgetState {
  used: number;
  limit: number;
}

const initialState: BudgetState = {
  used: 62,
  limit: 100,
};

const budgetSlice = createSlice({
  name: "budget",
  initialState,
  reducers: {
    setBudgetUsed(state, action: PayloadAction<number>) {
      state.used = action.payload;
    },
  },
});

export const { setBudgetUsed } = budgetSlice.actions;
export default budgetSlice.reducer;
