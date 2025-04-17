import prisma from "@/lib/prisma";
import { AuthOptions, Session } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import GitHubProvider from "next-auth/providers/github";
import bcrypt from "bcrypt";

const githubClientId = process.env.GITHUB_CLIENT_ID || "";
const githubClientSecret = process.env.GITHUB_CLIENT_SECRET || "";

export const authOptions: AuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      profile(profile) {
        return {
          id: profile.sub,
          email: profile.email,
          name: profile.name,
        };
      },
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text", placeholder: "jsmith" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials) return null;

        const user = await prisma.user.findFirst({
          where: { username: credentials.username },
        });

        if (!user || !user.password) return null;

        const passwordMatch = await bcrypt.compare(credentials.password, user.password);
        if (!passwordMatch) return null;
        return user;
      },
    }),
    GitHubProvider({
      clientId: githubClientId,
      clientSecret: githubClientSecret,
      authorization: { params: { scope: "repo" } },
    }),
  ],
  pages: {
    signIn: "/auth/signin",
  },
  callbacks: {
    async signIn({ user, account }) {

      if (account?.provider === "google") {
        try {
          const existingUser = await prisma.user.findUnique({
            where: { email: user.email! },
          });

          // if (!existingUser?.isComplete) {
          //   console.log("Redirecting user to complete signup...");
          //   return `/auth/signup?email=${encodeURIComponent(user.email!)}`;
          // }

          console.log("User successfully signed in.");
          return true;
        } catch (error) {
          console.error("Error during Google sign-in:", error);
          return false;
        }
      }

      return true;
    },



    // async session({ session }: { session: Session }) {
    

    //   if (session.user) {
    //     const dbUser = await prisma.user.findUnique({
    //       where: { email: session.user.email || "" },
    //     });

    //     if (dbUser) {
    //       return {
    //         ...session,
    //         user: {
    //           ...session.user,
    //           id: dbUser.id,
    //           isComplete: dbUser.isComplete,
    //         },
    //       };
    //     }
    //   }
    //   return session;
    // },
  },
  secret: process.env.NEXTAUTH_SECRET,
};