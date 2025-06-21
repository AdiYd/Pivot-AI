import { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import CredentialsProvider from "next-auth/providers/credentials"
import { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      provider?: string
    } & DefaultSession["user"]
  }

  interface User {
    id: string
    provider?: string
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    provider?: string
  }
}


// Pre-defined allowed users
const ALLOWED_USERNAMES = [
  "lidor",
  "p-vot",
  "demo"
];

const ALLOWED_EMAILS = [
  "lidor.zenou@gmail.com",
  "demo@pivot.com",
  "demo@gmail.com",
  "admin@webly.digital"
  // Add your allowed emails here
];

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      id: "username",
      name: "Username",
      credentials: {
        username: { label: "Username", type: "text" }
      },
      async authorize(credentials) {
        if (!credentials?.username) {
          return null;
        }

        // Check if username is in allowed list
        if (ALLOWED_USERNAMES.includes(credentials.username.toLowerCase())) {
          return {
            id: credentials.username,
            name: credentials.username,
            email: `${credentials.username}@pivot.com`,
            image: null,
          };
        }

        return null;
      }
    })
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      // For Google OAuth, check if email is allowed
      if (account?.provider === "google") {
        if (user.email && ALLOWED_EMAILS.includes(user.email)) {
          console.log("✅ Google sign in allowed for email:", user.email);
          return true;
        }
        console.log("❌ Google sign in denied for email:", user.email);
        return false; // Reject sign in
      }
      
      // For username provider, already validated in authorize
      return true;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.name = token.name as string;
        session.user.image = token.picture as string;
        session.user.provider = token.provider as string;
      }
      console.log("👤 Session callback:", { email: session.user?.email, provider: token.provider });
      return session;
    }
  },
  pages : {
    signIn: '/login',
    signOut: '/login',
    error: '/login', // Redirect errors to login page
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
}