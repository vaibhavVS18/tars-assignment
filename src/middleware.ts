import { NextResponse } from "next/server";

export function middleware() {
  console.log("MIDDLEWARE RUNNING");
  return NextResponse.redirect(new URL("/sign-in", "http://localhost:3000"));
}

export const config = {
  matcher: ["/"],
};