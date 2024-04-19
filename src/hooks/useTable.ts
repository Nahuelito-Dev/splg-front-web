import { useEffect, useState } from 'react';

import { useIsMutating, useQuery } from "@tanstack/react-query";

interface UseTableProps {
    queryKey: string,
    queryFn: (actualPage: number, rowsPerPage: number) => Promise<any>,
}

// This hook handles pagination && data fetching.

export const useTable = ({ queryKey, queryFn }: UseTableProps) => {

    // Pagination
    const [actualPage, setActualPage] = useState<number>(0);
    const [rowsPerPage, setRowsPerPage] = useState<number>(5);
    const [maxRowsToShow, setMaxRowsToShow] = useState<number>(5);

    // Data Fetching
    const {
        data,
        refetch,
        isLoading,
        // isError 
    } = useQuery({
        queryKey: [queryKey, actualPage],
        queryFn: () => queryFn(actualPage, rowsPerPage),
        keepPreviousData: true,
        staleTime: 5000,
    })

    const mutations = useIsMutating({ mutationKey: [queryKey] })

    useEffect(() => {
        data ? setMaxRowsToShow(data[`max${queryKey.charAt(0).toUpperCase() + queryKey.slice(1)}`]) : setMaxRowsToShow(0)
    }, [data, setMaxRowsToShow])

    useEffect(() => {
        refetch()
    }, [rowsPerPage, refetch])


    return {
        actualPage,
        rowsPerPage,
        maxRowsToShow,
        data,
        isLoading,
        isMutating: !!mutations,
        refetch,

        setActualPage,
        setRowsPerPage,
        setMaxRowsToShow
    }
} 