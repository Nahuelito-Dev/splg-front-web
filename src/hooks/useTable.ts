import { useEffect, useState } from 'react';
import { useIsMutating, useQuery } from '@tanstack/react-query';

interface UseTableProps {
  queryKey: string; // El nombre de la entidad (ej: 'users')
  queryFn: (actualPage: number, rowsPerPage: number) => Promise<any>;
  dependencies?: any[]; // <--- NUEVO: Para pasar filtros o búsqueda
}

export const useTable = ({
  queryKey,
  queryFn,
  dependencies = [],
}: UseTableProps) => {
  // Pagination
  const [actualPage, setActualPage] = useState<number>(0);
  const [rowsPerPage, setRowsPerPage] = useState<number>(5);
  const [maxRowsToShow, setMaxRowsToShow] = useState<number>(0); // Inicializar en 0 es más seguro

  // Data Fetching
  const { data, refetch, isLoading, isError } = useQuery({
    // AQUI ESTA LA MAGIA: Combinamos el nombre, la página y las dependencias (buscador)
    queryKey: [queryKey, actualPage, rowsPerPage, ...dependencies],
    queryFn: () => queryFn(actualPage, rowsPerPage),
    keepPreviousData: true,
    staleTime: 5000,
  });

  // Detectamos si hay mutaciones activas para esta entidad
  const mutations = useIsMutating({ mutationKey: [queryKey] });

  useEffect(() => {
    if (data) {
      // Lógica para encontrar 'maxUsers', 'maxProducts', etc.
      // Esto solo funciona si queryKey es un string, por eso lo separamos de dependencies
      const dynamicKey = `max${queryKey.charAt(0).toUpperCase() + queryKey.slice(1)}`;

      // Verificamos si existe la propiedad, si no, intentamos un fallback común
      if (data[dynamicKey] !== undefined) {
        setMaxRowsToShow(data[dynamicKey]);
      } else if (data.maxRows !== undefined) {
        setMaxRowsToShow(data.maxRows);
      } else if (data.total !== undefined) {
        setMaxRowsToShow(data.total);
      } else {
        setMaxRowsToShow(0);
      }
    } else {
      setMaxRowsToShow(0);
    }
  }, [data, queryKey]);

  // Ya no necesitamos el useEffect de refetch manual, useQuery lo hará solo al cambiar dependencies

  return {
    actualPage,
    rowsPerPage,
    maxRowsToShow,
    data,
    isLoading,
    isError,
    isMutating: mutations > 0, // Convertimos el número a booleano
    refetch,
    setActualPage,
    setRowsPerPage,
    setMaxRowsToShow,
  };
};
