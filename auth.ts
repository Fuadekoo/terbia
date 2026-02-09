/* eslint-disable @typescript-eslint/no-explicit-any */
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import prisma from "./lib/db";
import { loginSchema } from "./lib/zodSchema";

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        phoneno: { label: "Phone Number", type: "text" },
        passcode: { label: "Passcode", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.phoneno || !credentials?.passcode) {
          return null;
        }

        try {
          // Validate credentials format
          const parsed = loginSchema.safeParse({
            phoneno: credentials.phoneno,
            passcode: credentials.passcode,
          });

          if (!parsed.success) {
            return null;
          }

          const { phoneno, passcode } = parsed.data;

          // FIRST: Check in admin table
          const admin = await prisma.admin.findFirst({
            where: { phoneno },
            select: {
              id: true,
              phoneno: true,
              name: true,
              passcode: true,
            },
          });

          if (admin && admin.passcode === passcode) {
            console.log("Admin authentication successful");
            return {
              id: admin.id.toString(),
              name: admin.name,
              email: admin.phoneno,
              userType: "admin",
            };
          }

          // SECOND: If not admin, check in ustaz table
          const ustaz = await prisma.responseUstaz.findFirst({
            where: {
              phoneno: phoneno,
              permissioned: true, // Only allow permissioned ustaz
            },
            select: {
              id: true,
              phoneno: true,
              ustazname: true,
              passcode: true,
              permissioned: true,
            },
          });

          if (ustaz && ustaz.passcode === passcode) {
            console.log("Ustaz authentication successful");
            return {
              id: ustaz.id.toString(),
              name: ustaz.ustazname,
              email: ustaz.phoneno,
              userType: "ustaz",
            };
          }

          // If neither admin nor ustaz found with valid credentials
          console.log("Authentication failed: No valid user found");
          return null;
        } catch (error) {
          console.error("Authentication error:", error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userType = (user as any).userType;
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        (session.user as any).userType = token.userType;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      else if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },
  },
  pages: {
    signIn: "/en/login",
    error: "/en/login",
  },
  events: {
    async signOut() {
      console.log("User signed out");
    },
  },
});
