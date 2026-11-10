import axios from "axios";


const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || "",
    withCredentials: true
})


export async function getSong({ mood }) {
    const response = await api.get("/api/songs?mood=" + mood)
    console.log(response)
    return response.data
}