import { supabase } from "./supabase";

export async function signUp(username: string, password: string) {
  return supabase.auth.signUp({
    email: `${username}@tempo.com`,
    password,
  });
}

export async function signIn(username: string, password: string) {
  return supabase.auth.signInWithPassword({
    email: `${username}@tempo.com`,
    password,
  });
}

export async function signOut() {
  return supabase.auth.signOut();
}
