import { auth } from "@clerk/nextjs/server";

export default async function GamePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await auth.protect();
  const { id } = await params;

  return (
    <div className="p-4">
      <p>{id}</p>
    </div>
  );
}
