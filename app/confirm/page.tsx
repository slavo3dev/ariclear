import { redirect } from "next/navigation";

export default async function ConfirmPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string; next?: string }>;
}) {
  const params = await searchParams;

  const qs = new URLSearchParams({
    code: params.code ?? "",
    next: params.next ?? "/",
  });

  redirect(`/api/auth/confirm?${qs.toString()}`);
}
