import { privateAxiosInstance } from "./axiosConfig";
import { Lead } from "../../interfaces";


export const getAllLeads = async (page = 0, LEADS_PER_PAGE = 0): Promise<{ leads: Lead[], maxLeads: number }> => {
    const offset: number = LEADS_PER_PAGE * page!;
    const response = await privateAxiosInstance.get(`/leads?limit=${LEADS_PER_PAGE}&offset=${offset}`);
    return response.data;
}

export const SearchLead = async (
    searchQuery: string,
    page = 0,
    LEADS_PER_PAGE = 10,
    searchField: 'email' | 'project'
): Promise<{ leads: Lead[]; totalLeads: number }> => {
    const offset = LEADS_PER_PAGE * page;

    const params = {
        limit: LEADS_PER_PAGE,
        offset,
        [searchField]: searchQuery.trim(),
    };

    const queryParams = new URLSearchParams(
        Object.entries(params)
            .filter(([_, v]) => v != null)
            .map(([k, v]) => [k, String(v)])
    ).toString();

    console.log('Query Params Generado:', queryParams);

    try {
        const response = await privateAxiosInstance.get(`/leads/search?${queryParams}`);
        console.log('Respuesta de SearchLead:', response.data);
        return response.data;
    } catch (error) {
        console.error('Error en SearchLead:', error);
        throw error;
    }
};



export const getOneLead = async (id: string) => {
    const { data } = await privateAxiosInstance.get<Lead>(
        `/leads/${id}`
    );
    return data;
};