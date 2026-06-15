import { withAuth } from "next-auth/middleware";

const authProxy = withAuth({
  pages: {
    signIn: "/login",
  },
});

// Next.js 16 expects the named export "proxy" instead of default middleware export
export { authProxy as proxy };

export const config = {
  matcher: [
    "/groups/:path*",
    "/expenses/:path*",
    "/import/:path*",
  ],
};
