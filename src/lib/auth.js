import { PrismaAdapter } from "@next-auth/prisma-adapter";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "./prisma";
import { decryptApiKey, encryptApiKey, keyIdentity } from "./api-key";

export const authOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    CredentialsProvider({
      id: "credentials",
      name: "API Key",
      credentials: {
        apiKey: { label: "MuAPI Key", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.apiKey) {
          throw new Error("API Key is required");
        }
        const apiKey = credentials.apiKey.trim();
        if (apiKey.length < 5) {
          throw new Error("Invalid API key format");
        }

        const dummyEmail = `apikey_${keyIdentity(apiKey)}@muapi.local`;
        const legacyEmail = `apikey_${apiKey.slice(-8)}@muapi.local`;
        let dbUser = await prisma.user.findUnique({ where: { email: dummyEmail } });
        if (!dbUser) {
          const legacyUser = await prisma.user.findUnique({ where: { email: legacyEmail } });
          if (legacyUser && decryptApiKey(legacyUser.customApiKey) === apiKey) dbUser = legacyUser;
        }

        if (dbUser && decryptApiKey(dbUser.customApiKey) !== apiKey) {
          throw new Error("Invalid API key");
        }

        if (!dbUser) {
          dbUser = await prisma.user.create({
            data: {
              name: "API Key User",
              email: dummyEmail,
              customApiKey: encryptApiKey(apiKey),
              credits: 0,
            }
          });
        } else if (!dbUser.customApiKey?.startsWith("enc:v1:")) {
          dbUser = await prisma.user.update({
            where: { id: dbUser.id },
            data: { customApiKey: encryptApiKey(apiKey), email: dummyEmail }
          });
        }

        return {
          id: dbUser.id,
          name: dbUser.name,
          email: dbUser.email,
          image: dbUser.image || null,
          credits: dbUser.credits,
          isApiKeyUser: true,
        };
      }
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // Clear keys left in JWTs issued by older versions of this app.
      delete token.customApiKey;
      if (user) {
        token.id = user.id;
        token.credits = user.credits;
        token.isApiKeyUser = user.isApiKeyUser || false;
      }
      const userId = token.id || token.sub;
      if (userId) {
        token.id = userId;
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: userId },
            select: { credits: true, customApiKey: true }
          });
          if (dbUser) {
            token.credits = dbUser.credits;
            token.hasCustomApiKey = Boolean(dbUser.customApiKey);
          }
        } catch (err) {}
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token) {
        session.user.id = token.id || token.sub;
        session.user.credits = token.credits;
        session.user.hasCustomApiKey = Boolean(token.hasCustomApiKey);
        session.user.isApiKeyUser = Boolean(token.isApiKeyUser);
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/login",
  },
};
