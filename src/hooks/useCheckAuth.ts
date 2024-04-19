import { onAuthStateChanged } from 'firebase/auth';
import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { FirebaseAuth } from '../firebase/config';
import { getAdmin } from '../services/api/auth';
import { logOut, login } from '../store/auth/authSlice';
import { useAppSelector } from './reduxHooks';

export const useCheckAuth = () => {
    const { status } = useAppSelector(state => state.auth);
    const dispatch = useDispatch();

    useEffect(() => {
        onAuthStateChanged(FirebaseAuth, async (user) => {
            console.log('login');
            if (!user) return dispatch(logOut({}))
            const { uid, email, displayName, } = user
            const userInfo = await getAdmin(email!)
            console.log(userInfo);
            
            dispatch(login({ uid, email, displayName, role: userInfo.role, fullName: userInfo.fullName }))
        })
    }, [dispatch])

    return {
        status
    }

}
