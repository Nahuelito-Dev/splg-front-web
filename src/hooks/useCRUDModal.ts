import { useMutation, useQueryClient } from '@tanstack/react-query'
import { store } from '../store/store'
import { setErrorMessage, setSuccessMessage } from '../store/ui'

interface Props<Entity, newEntity> {
    createFn?: (entity: newEntity) => Promise<Entity>,
    updateFn?: (entity: Entity) => Promise<Entity>,
    deleteFn?: (entity: Entity) => Promise<Entity>,
    queryKey: string
}

export const useCRUDModal = <Entity, NewEntity>({ createFn, updateFn, deleteFn, queryKey }: Props<Entity, NewEntity>) => {
    const queryClient = useQueryClient()

    const notifySuccess = (actionMade: string) => {
        queryClient.invalidateQueries([queryKey])
        store.dispatch(setSuccessMessage({
            message: `${queryKey[0].toUpperCase() +
                queryKey.slice(1)} ${actionMade} correctamente`
        }))
    }

    const notifyError = (actionMade: string) => {
        queryClient.invalidateQueries([queryKey])
        store.dispatch(setErrorMessage({
            message: `No se pudo ${actionMade} ${queryKey[0].toUpperCase() +
                queryKey.slice(1)}`
        }))
    }

    const createMutation = useMutation({
        mutationKey: [queryKey],
        mutationFn:
            createFn,
        onSuccess:
            () => notifySuccess('creado'),
        onError:
            () => notifyError('crear'),
    })

    const updateMutation = useMutation({
        mutationKey: [queryKey],
        mutationFn:
            updateFn,
        onSuccess:
            () => notifySuccess('actualizado'),
        onError:
            () => notifyError('actualizar')
    })

    const deleteMutation = useMutation({
        mutationKey: [queryKey],
        mutationFn:
            deleteFn,
        onSuccess:
            () => notifySuccess('eliminado'),
        onError:
            () => notifyError('eliminar')
    })
    return {
        createMutation,
        updateMutation,
        deleteMutation
    }
}
