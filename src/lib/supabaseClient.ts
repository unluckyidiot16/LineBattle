// src/lib/supabaseClient.ts
import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!url || !anonKey) {
    // 개발 중 확인 편의를 위한 에러
    console.warn("[Supabase] 환경변수(VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)가 없습니다.");
}

export const supa = createClient(url, anonKey, {
    auth: {
        persistSession: true,
        autoRefreshToken: true
    },
    global: {
        headers: { "x-client": "quiz-line-battle" }
    }
});
