/**
 * KUDOS Auth.js v5 config · T1.3.
 *
 * Google OAuth + JWT session.
 * El id_token de Google se envia al backend KUDOS en authorized callback,
 * el backend devuelve un access_token KUDOS que persiste en la sesion.
 */
import NextAuth, { type DefaultSession } from "next-auth";
import Google from "next-auth/providers/google";


const KUDOS_API = process.env.NEXT_PUBLIC_KUDOS_API_URL || "";


declare module "next-auth" {
  interface Session {
    kudosAccessToken?: string;
    user: {
      id?: string;
      kudosUserId?: string;
      primaryInterest?: string;
    } & DefaultSession["user"];
  }
}


export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: { params: { prompt: "select_account" } },
    }),
  ],

  session: { strategy: "jwt" },

  callbacks: {
    /**
     * Tras OAuth Google, llama al backend KUDOS para intercambiar id_token
     * por par JWT (access + refresh cookie).
     */
    async signIn({ account }) {
      if (account?.provider !== "google" || !account.id_token) return false;
      try {
        if (!KUDOS_API) return true;  // sin backend, dev mode
        const r = await fetch(`${KUDOS_API}/api/auth/oauth/google`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id_token: account.id_token }),
          credentials: "include",
        });
        return r.ok;
      } catch {
        return false;
      }
    },

    async jwt({ token, account, user }) {
      if (account?.provider === "google" && account.id_token) {
        token.googleIdToken = account.id_token;
      }
      if (user?.email) token.email = user.email;
      return token;
    },

    async session({ session, token }) {
      // El access_token KUDOS lo gestiona la cookie del backend (httpOnly).
      // Aqui solo exponemos lo no-secreto.
      session.user.id = (token.sub as string) || session.user.id;
      return session;
    },
  },

  pages: {
    signIn: "/auth/sign-in",
  },
});
