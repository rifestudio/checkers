import { supabase } from "./supabase";

import { serializeBoard } from "./serializeBoard";
import { createInitialBoard } from "@/components/game/CheckersBoard";

// Generate a 6-char invite code that works in every browser context.
//
// Why this isn't just `crypto.randomUUID().slice(0, 6)`:
// - crypto.randomUUID requires a secure context (HTTPS or localhost).
// - On mobile phones loading the app via local IP (http://192.168.x.x), the
//   page is NOT a secure context — crypto.randomUUID throws TypeError and
//   createGame fails silently. This is the most common reason that "create
//   friend game" and "random match" appear broken on phones during local
//   development.
// - crypto.randomUUID also needs iOS Safari 15.4+ / Android Chrome 92+; older
//   devices simply don't have it.
//
// crypto.getRandomValues is available much more broadly (back to ~2012) and
// works in insecure contexts. Math.random is the unconditional fallback —
// invite codes only need to be unguessable, not cryptographically random.
function generateInviteCode(): string {
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  const len = 6;

  if (
    typeof crypto !== "undefined" &&
    typeof crypto.getRandomValues === "function"
  ) {
    const bytes = new Uint8Array(len);
    crypto.getRandomValues(bytes);
    let out = "";
    for (let i = 0; i < len; i++) {
      out += alphabet[bytes[i] % alphabet.length];
    }
    return out;
  }

  // Last-resort fallback.
  let out = "";
  for (let i = 0; i < len; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

export interface CreateGameOptions {
  isPublic?: boolean;
}

export async function createGame(
  userId: string,
  options: CreateGameOptions = {},
) {
  const inviteCode = generateInviteCode();

  const { data, error } = await supabase
    .from("games")
    .insert({
      white_player: userId,

      invite_code: inviteCode,

      board: serializeBoard(createInitialBoard()),

      status: "waiting",

      is_public: options.isPublic ?? false,
    })
    .select()
    .single();

  return {
    data,
    error,
  };
}

export async function joinGame(inviteCode: string, userId: string) {
  const { data: game, error } = await supabase
    .from("games")
    .select("*")
    .eq("invite_code", inviteCode)
    .single();

  if (error || !game) {
    return {
      error,
    };
  }

  // already joined
  if (game.black_player) {
    return {
      data: game,
    };
  }

  return supabase
    .from("games")
    .update({
      black_player: userId,

      status: "playing",
    })
    .eq("id", game.id)
    .select()
    .single();
}
