import { createContext, useEffect, useState, useCallback, useRef } from 'react';
import supabase from '../services/supabaseClient';
import { seedUserData } from '../utils/seedUserData';
import TripRepository from '../database/repositories/TripRepository';
import CategoryRepository from '../database/repositories/CategoryRepository';
import ItemRepository from '../database/repositories/ItemRepository';
import ParticipantRepository from '../database/repositories/ParticipantRepository';
import ContributionRepository from '../database/repositories/ContributionRepository';
import ExpenseRepository from '../database/repositories/ExpenseRepository';
import PlaceRepository from '../database/repositories/PlaceRepository';
import ActivityRepository from '../database/repositories/ActivityRepository';
import { subscribeToEntity, isRecentlySynced, processAllPendingSupabase, unsubscribeAll } from '../services/supabaseSync';
import { emitTripChange } from '../services/tripSyncEvents';
import { dbReady } from '../database/db';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authReady, setAuthReady] = useState(false);
  const hydratedSessionId = useRef(null);

   const loadProfile = useCallback(async (userId, userObj = null) => {
     if (!userId) return null;

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
           setProfile(newProfile);
           return newProfile;
         }
         return null;
       }

       if (!error) {
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
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user?.id)
      .select('id, display_name, phone, avatar_url, created_at, updated_at')
      .single();

    if (!error) {
      setProfile(data);
    }

    return { data, error: error?.message || null };
  };

  const uploadAvatar = async (file) => {
    if (!file || !user?.id) {
      return { error: 'No user or file' };
    }

    const sanitized = file.name
      .toLowerCase()
      .replace(/[^a-z0-9.-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'avatar';

    const ext = sanitized.split('.').pop();
    const baseName = sanitized.slice(0, sanitized.lastIndexOf('.') || sanitized.length);
    const fileName = `${user.id}/${Date.now()}-${baseName}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      return { error: uploadError.message };
    }

    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(fileName);

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_url: publicUrl })
      .eq('id', user.id);

    if (updateError) {
      return { error: updateError.message };
    }

    setProfile((prev) => ({ ...prev, avatar_url: publicUrl }));

    return { success: true, url: publicUrl };
  };

  useEffect(() => {
    let mounted = true;
    let authSubscription;

    const setupRealtime = (userId) => {
      const entities = [
        'trips',
        'expenseCategories',
        'expenseItems',
        'participants',
        'contributions',
        'expenses',
        'places',
        'activities',
      ];

      for (const entity of entities) {
        subscribeToEntity(entity, userId, (recordId, eventType) => {
          if (entity === 'trips' && isRecentlySynced('trips', recordId)) {
            return;
          }

          if (entity === 'trips') {
            emitTripChange(recordId, eventType);
          }
        });
      }
    };

    const hydrateSession = async (userId, userObj = null) => {
      console.log('[AuthContext] hydrateSession: userId=', userId);
      await dbReady;
      await loadProfile(userId, userObj);
      await seedUserData(userId);
      console.log('[AuthContext] hydrateSession: hydrating entities for userId=', userId);
      await TripRepository.hydrateTripsFromSupabase(userId);
      await CategoryRepository.hydrateCategoriesFromSupabase(userId);
      await ItemRepository.hydrateItemsFromSupabase(userId);
      await ParticipantRepository.hydrateParticipantsFromSupabase(userId);
      await ContributionRepository.hydrateContributionsFromSupabase(userId);
      await ExpenseRepository.hydrateExpensesFromSupabase(userId);
      await PlaceRepository.hydratePlacesFromSupabase(userId);
      await ActivityRepository.hydrateActivitiesFromSupabase(userId);
      console.log('[AuthContext] hydrateSession: processing pending supabase');
      await processAllPendingSupabase();
      setupRealtime(userId);
      console.log('[AuthContext] hydrateSession: complete for userId=', userId);
    };

    const initialize = async () => {
      console.log('[AuthContext] initialize: starting');
      try {
        const { data: { session } } = await supabase.auth.getSession();

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
      if (mounted && user?.id) {
        await processAllPendingSupabase();
      }
    };

    try {
      const { data: { subscription: sub } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          if (!mounted) return;

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

    return () => {
      mounted = false;
      if (authSubscription) authSubscription.unsubscribe();
      unsubscribeAll();
      window.removeEventListener('online', handleOnline);
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
