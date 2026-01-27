import { NextAuthConfig } from "next-auth";
import CredentialProvider from "next-auth/providers/credentials";
import { JWT } from "next-auth/jwt";
import { Session } from "next-auth";
import api from "./core/api";
import { extractUserRoles } from "./core/auth";
import type { CustomUser } from "./core/auth";

// CustomUser type is imported from the centralized core module

interface CustomSession extends Session {
  user: CustomUser;
  accessToken: string;
}

const authConfig = {
  providers: [
    // GithubProvider({
    //   clientId: process.env.GITHUB_ID ?? '',
    //   clientSecret: process.env.GITHUB_SECRET ?? ''
    // }),
    CredentialProvider({
      credentials: {
        email: {
          type: "email",
        },
        password: {
          type: "password",
        },
      },
      async authorize(credentials: any, req: any): Promise<CustomUser | null> {
        try {
          if (!credentials?.email || !credentials?.password) {
            console.error('NextAuth: No credentials provided');
            return null;
          }

          // Use the API client to authenticate
          const userData = await api.auth.login(credentials.email, credentials.password);

          // Extract roles using the updated function
          const roles = extractUserRoles(userData);

          // Create the CustomUser object required by NextAuth
          const user: CustomUser = {
            id: userData.user_id,
            email: userData.email,
            token: userData.access_token,
            name: `${userData.first_name} ${userData.last_name}`,
            role: roles[0] || 'user', // Use first role for backward compatibility
            roles: roles, // Store all roles
            accessToken: userData.access_token,
            tenant_id: userData.tenant_id || '4c56d0c3-55d9-495b-ae26-0d922d430a42',
          };

          return user;
        } catch (error) {
          console.error('NextAuth: Authentication error:', error);
          return null;
        }
      },
    }),
  ],
  pages: {
    signIn: "/", //sigin page
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    // Persist the user data to the JWT token on initial sign in
    async jwt({ token, user }: { token: JWT; user: CustomUser | null }) {
      if (user) {
        token.user = user;
        token.accessToken = user.accessToken;
      }
      return token;
    },
    // Make the user data and accessToken available in the session object
    async session({
      session,
      token,
    }: {
      session: Session;
      token: JWT & { user: CustomUser; accessToken: string };
    }) {
      // Synchronize the token with localStorage for our API client
      if (typeof window !== 'undefined' && token.accessToken) {
        // Store token in localStorage for our API client to use
        localStorage.setItem('token', token.accessToken);

        // If we have a refresh token in the user object, store that too
        if (token.user?.token) {
          localStorage.setItem('refresh_token', token.user.token);
        }
      }

      session.user = token.user;
      (session as CustomSession).accessToken = token.accessToken;
      return session as CustomSession;
    },
  },
  trustHost: true,
};

export default authConfig;
