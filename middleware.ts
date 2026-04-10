export { auth as middleware } from "@/lib/auth";

export const runtime = "nodejs";

export const config = {
  matcher: ["/(dashboard)(.*)", "/rules(.*)", "/personal(.*)", "/users(.*)"],
};
