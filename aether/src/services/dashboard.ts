import { createAsyncThunk } from "@reduxjs/toolkit";
import api from "../api/api";


export const fetchUserProjects = createAsyncThunk('projects/fetchUserProjects', async (userId: string, thunkAPI) => {
    try {

        const res = await api.get(`/projects/${userId}`)
        return thunkAPI.fulfillWithValue({
            projects: res.data.data.projects,
            currentProjectId: res.data.data.currentProjectId

        })


    }
    catch (err: any) {
        return thunkAPI.rejectWithValue({
            error: err?.message || "Failed to fetch projects"

        })

    }

})

export const fetchDailyDigest = createAsyncThunk('tasks/fetchDailyDigest', async ({ githubAccessToken, repoId }: {
    githubAccessToken: string,
    repoId: string
}, thunkAPI) => {
    try {

        const response = await api.post(`/dashboard/daily-digest`, {
            githubAccessToken,
            repoId

        })

        const data = response.data

        return thunkAPI.fulfillWithValue({
            yesterday: data.yesterday,
            prediction: data.prediction?.description,
            tasks: data.tasks

        })



    }
    catch (err: any) {
        return thunkAPI.rejectWithValue({
            error: err?.message || "Failed to fetch daily digest"

        })




    }
})