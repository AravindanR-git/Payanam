import { createContext, useEffect, useState, useCallback, useRef } from 'react';
import supabase from '../services/supabaseClient';
import { seedUserData } from '../utils/seedUserData';
import { SYNC_ENTITIES, subscribeToEntity, subscribeToTombstones, subscribeToProfile, isRecentlySynced, syncAccountData, unsubscribeAll } from '../services/supabaseSync';
import { activateLocalAccount } from '../services/localAccountScope';
import { emitTripChange } from '../services/tripSyncEvents';
import { emitCategoryChange } from '../services/categorySyncEvents';
import { emitItemChange } from '../services/itemSyncEvents';
import { dbReady } from '../database/db';
import { imageFileToDataUrl } from '../utils/imageData';
import { enqueueSync } from '../services/syncEnqueue';
import db from '../database/db';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authReady, setAuthReady] = useState(false);
  const hydratedSessionId = useRef(null);
  const activeUserId = useRef(null);

   const loadProfile = useCallback(async (userId, userObj = null) => {
     if (!userId) return null;

     const cached = await db.profiles.get(userId);
     if (cached) setProfile(cached);
     const pendingProfile = await db.pendingSync.where('tableName').equals('profiles')
       .and((entry) => entry.recordId === userId && ['PENDING', 'FAILED'].includes(entry.status))
       .first();
     if (cached && pendingProfile) return cached;

     try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, display_name, phone, avatar_url, created_at, updated_at')
          .eq('id', userId)
          .single();

        if (error && error.code === 'PGRST116') {
          const { data: newProfile, error: insertError } = await supabase
            .from('profiles')
            .insert({
              id: userId,
              display_name: userObj?.user_metadata?.display_name || userObj?.email || '',
              phone: userObj?.user_metadata?.phone || null,
            })
            .select('id, display_name, phone, avatar_url, created_at, updated_at')
            .single();

         if (!insertError) {
           await db.profiles.put({ ...newProfile, userId, updatedAt: newProfile.updated_at || newProfile.created_at });
           setProfile(newProfile);
           return newProfile;
         }
         return null;
       }

       if (!error) {
         await db.profiles.put({ ...data, userId, updatedAt: data.updated_at || data.created_at });
         setProfile(data);
         return data;
       }
     } catch {
       return null;
     }
     return null;
   }, []);

  const signUp = async ({ email, password, fullName, phone }) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: fullName,
          phone: phone || null,
        },
      },
    });

    if (error) {
      return { error: error.message };
    }

    return { data, needsEmailVerification: !data.user?.email_confirmed_at ? true : false };
  };

  const signIn = async ({ emailOrPhone, password }) => {
    let signInData;

    if (emailOrPhone.includes('@')) {
      signInData = { email: emailOrPhone, password };
    } else {
      signInData = { phone: emailOrPhone, password };
    }

    const { data, error } = await supabase.auth.signInWithPassword(signInData);

    if (error) {
      return { error: error.message };
    }

    return { data };
  };

  const verifyOTP = async ({ email, token }) => {
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'email',
    });

    if (error) {
      return { error: error.message };
    }

    return { data };
  };

  const resendVerificationEmail = async (email) => {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
    });

    return { error: error?.message || null };
  };

  const resetPassword = async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email);

    if (error) {
      return { error: error.message };
    }

    return { success: true };
  };

  const verifyResetOTP = async ({ email, token }) => {
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'recovery',
    });

    if (error) {
      return { error: error.message };
    }

    return { data };
  };

  const updatePassword = async (newPassword) => {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      return { error: error.message };
    }

    return { success: true };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    return { error: error?.message || null };
  };

  const updateProfile = async (updates) => {
    if (!user?.id) return { data: null, error: 'Sign in to update your profile.' };
    const current = await db.profiles.get(user.id) || profile || { id: user.id, userId: user.id, display_name: user.email || '', phone: null, avatar_url: null, created_at: new Date().toISOString() };
    const data = { ...current, ...updates, id: user.id, userId: user.id, updatedAt: new Date().toISOString() };
    if (Object.hasOwn(updates, 'avatar_url')) data.avatarData = null;
    await db.profiles.put(data);
    await enqueueSync('profiles', user.id, current.created_at ? 'UPDATE' : 'CREATE', data);
    setProfile(data);
    return { data, error: null };
  };

  const uploadAvatar = async (file) => {
    if (!file || !user?.id) {
      return { error: 'No user or file' };
    }

    try {
      const avatarData = await imageFileToDataUrl(file, 700, 0.78);
      const current = await db.profiles.get(user.id) || profile || { id: user.id, userId: user.id, display_name: user.email || '', created_at: new Date().toISOString() };
      const next = { ...current, id: user.id, userId: user.id, avatarData, updatedAt: new Date().toISOString() };
      await db.profiles.put(next);
      await enqueueSync('profiles', user.id, current.created_at ? 'UPDATE' : 'CREATE', next);
      setProfile(next);
      return { success: true, url: avatarData };
    } catch (error) {
      return { error: error?.message || 'Could not read the selected photo.' };
    }
  };

  useEffect(() => {
    let mounted = true;
    let authSubscription;

    const setupRealtime = (userId) => {
      for (const entity of SYNC_ENTITIES) {
        if (entity === 'profiles') continue;
        subscribeToEntity(entity, userId, (recordId, eventType) => {
          if (isRecentlySynced(entity, recordId)) {
            return;
          }

          if (entity === 'trips') {
            emitTripChange(recordId, eventType);
          }

          if (entity === 'expenseCategories') {
            emitCategoryChange(recordId, eventType);
          }

          if (entity === 'expenseItems') {
            emitItemChange(recordId, eventType);
          }
          window.dispatchEvent(new CustomEvent('tripledger:sync-change', { detail: { entity, recordId, eventType } }));
        });
      }
      subscribeToTombstones(userId, (entity, recordId, eventType) => {
        window.dispatchEvent(new CustomEvent('tripledger:sync-change', { detail: { entity, recordId, eventType } }));
      });
      subscribeToProfile(userId, setProfile);
    };

    const hydrateSession = async (userId, userObj = null) => {
      console.log('[AuthContext] hydrateSession: userId=', userId);
      await dbReady;
      await activateLocalAccount(userId);
      activeUserId.current = userId;
      await loadProfile(userId, userObj);
      await seedUserData(userId);
      console.log('[AuthContext] hydrateSession: hydrating entities for userId=', userId);
      await syncAccountData(userId);
      await loadProfile(userId, userObj);
      setupRealtime(userId);
      console.log('[AuthContext] hydrateSession: complete for userId=', userId);
    };

    const initialize = async () => {
      console.log('[AuthContext] initialize: starting');
      try {
        const { data: { session } } = await supabase.auth.getSession();

        await dbReady;
        await activateLocalAccount(session?.user?.id || null);
        activeUserId.current = session?.user?.id || null;

        if (mounted) {
          setSession(session);
          setUser(session?.user ?? null);
          setAuthReady(true);
        }

        if (session?.user && mounted) {
          console.log('[AuthContext] initialize: session found, userId=', session.user.id);
          if (hydratedSessionId.current !== session.user.id) {
            hydratedSessionId.current = session.user.id;
            await hydrateSession(session.user.id, session.user);
          } else {
            console.log('[AuthContext] initialize: session already hydrated, skipping');
          }
        } else {
          console.log('[AuthContext] initialize: no session');
        }
      } catch (err) {
        console.error('[AuthContext] initialize error:', err);
        if (mounted) setAuthReady(true);
      }

      if (mounted) setLoading(false);
      console.log('[AuthContext] initialize: complete');
    };

    initialize();

    const handleOnline = async () => {
      if (mounted && activeUserId.current) {
        await syncAccountData(activeUserId.current);
        await loadProfile(activeUserId.current);
      }
    };

    const handleForeground = async () => {
      if (mounted && document.visibilityState === 'visible' && navigator.onLine && activeUserId.current) {
        await syncAccountData(activeUserId.current);
        await loadProfile(activeUserId.current);
      }
    };

    try {
      const { data: { subscription: sub } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          if (!mounted) return;

          await activateLocalAccount(session?.user?.id || null);
          activeUserId.current = session?.user?.id || null;

          setSession(session);
          setUser(session?.user ?? null);
          setAuthReady(true);

          if (session?.user) {
            if (hydratedSessionId.current !== session.user.id) {
              hydratedSessionId.current = session.user.id;
              await hydrateSession(session.user.id);
            }
          } else {
            unsubscribeAll();
            hydratedSessionId.current = null;
            setProfile(null);
          }

          setLoading(false);
        }
      );
      authSubscription = sub;
    } catch (error) {
      console.error('Failed to set up auth state change listener:', error);
    }

    window.addEventListener('online', handleOnline);
    document.addEventListener('visibilitychange', handleForeground);
    window.addEventListener('focus', handleForeground);

    return () => {
      mounted = false;
      if (authSubscription) authSubscription.unsubscribe();
      unsubscribeAll();
      window.removeEventListener('online', handleOnline);
      document.removeEventListener('visibilitychange', handleForeground);
      window.removeEventListener('focus', handleForeground);
    };
  }, [loadProfile]);

  const value = {
    user,
    session,
    profile,
    loading,
    authReady,
    signUp,
    signIn,
    signOut,
    resetPassword,
    verifyResetOTP,
    updatePassword,
    verifyOTP,
    resendVerificationEmail,
     updateProfile,
     uploadAvatar,
     loadProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export { AuthContext };

export default AuthProvider;
