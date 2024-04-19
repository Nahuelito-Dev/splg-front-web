import { privateAxiosInstance, publicAxiosInstance } from "./axiosConfig";

export const checkToken = async () => {
    const response = await privateAxiosInstance.post('/admin/validate');
    return response.status
}

export const getAdmin = async (email: string) => {
    try {
        const response = await publicAxiosInstance.get(`/admin/email/${email}`);
        return response.data
    } catch (error: any) {
        return error.response.status
    }
}