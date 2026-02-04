import { NextAuthConfig } from "next-auth";
import CredentialProvider from "next-auth/providers/credentials";
import { JWT } from "next-auth/jwt";
import { Session } from "next-auth";
// import api from "./core/api";
import { extractUserRoles } from "./core/auth";
import type { CustomUser, AppRole } from "./core/auth";

// CustomUser type is imported from the centralized core module

// Bypass strict NextAuth type check for role
// Bypass strict NextAuth type check for role
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
      async authorize(credentials: Record<string, unknown> | undefined, req: unknown): Promise<CustomUser | null> {
        try {
          // Narrow down the type for usage
          const creds = credentials as { email?: string; password?: string } | undefined;

          if (!creds?.email || !creds?.password) {
            console.error('NextAuth: No credentials provided');
            return null;
          }

          // Use fetch directly to avoid axios dependency in Edge Runtime
          const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
          const response = await fetch(`${baseUrl}/auth/login`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              identifier: creds.email,
              password: creds.password,
              is_phone: false
            }),
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Authentication failed');
          }

          const apiResponse = await response.json();
          const userData = apiResponse;

          // Extract roles using the updated function
          const roles = extractUserRoles(userData);

          // Create the CustomUser object required by NextAuth
          const user: CustomUser = {
            id: userData.user_id,
            email: userData.email,
            token: userData.access_token,
            name: `${userData.first_name} ${userData.last_name}`,
            role: (roles[0] || 'support') as AppRole,
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
