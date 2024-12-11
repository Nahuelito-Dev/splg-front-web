import { privateAxiosInstance } from "./axiosConfig";
import { Lead } from "../../interfaces";


export const getAllLeads = async (page = 0, LEADS_PER_PAGE = 0): Promise<{ leads: Lead[], maxLeads: number }> => {
    const offset: number = LEADS_PER_PAGE * page!;
    const response = await privateAxiosInstance.get(`/leads?limit=${LEADS_PER_PAGE}&offset=${offset}`);
    return response.data;
}
