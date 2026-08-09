import { createTRPCReact } from "@trpc/react-query";

export const trpc = createTRPCReact<any>();

export function getTrpcUrl(): string {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/api/trpc`;
  }
  const host = process.env.NEXT_PUBLIC_API_HOST || "http://localhost:3001";
  return `${host}/api/trpc`;
}

export const trpcClient = {} as any;
