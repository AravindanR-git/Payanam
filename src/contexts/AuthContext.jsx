import { createContext, useEffect, useState, useCallback } from 'react';
import supabase from '../services/supabaseClient';
import { seedUserData } from '../utils/seedUserData';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authReady, setAuthReady] = useState(false);

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
      .replace(/[^a-z0-9.\-]/g, '-')
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

    const initialize = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (mounted) {
          setSession(session);
          setUser(session?.user ?? null);
          setAuthReady(true);
        }

        if (session?.user && mounted) {
          await loadProfile(session.user.id, session.user);
        }
      } catch {
        if (mounted) setAuthReady(true);
      }

      if (mounted) setLoading(false);
    };

    initialize();

    let subscription;
    try {
      const { data: { subscription: sub } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          if (mounted) {
            setSession(session);
            setUser(session?.user ?? null);
            setAuthReady(true);

            if (session?.user) {
              await loadProfile(session.user.id, session.user);
              await seedUserData(session.user.id);
            } else {
              setProfile(null);
            }

            setLoading(false);
          }
        }
      );
      subscription = sub;
    } catch (error) {
      console.error('Failed to set up auth state change listener:', error);
    }

    return () => {
      mounted = false;
      if (subscription) subscription.unsubscribe();
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
