import { prisma } from "@/lib/prisma";
import { CharacterActions } from "@/components/admin/RowActions";

export const dynamic = "force-dynamic";

export default async function AdminCharactersPage() {
  let characters = [];
  let error = "";
  try {
    characters = await prisma.character.findMany({
      orderBy: { createdAt: "desc" },
      take: 150,
      select: {
        id: true, name: true, isPublic: true, isCustom: true, moderationStatus: true, moderationNote: true,
        user: { select: { email: true } },
      },
    });
  } catch (err) {
    error = err.message;
  }
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-black">Nhân vật</h1>
      <p className="text-sm text-secondary-text">Ẩn khiến người khác không thấy và không mở chat mới. Xóa nhân vật tùy chỉnh cũng xóa hội thoại của nhân vật đó. Nhân vật mặc định chỉ ẩn được.</p>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <div className="space-y-3">
        {characters.map((character) => (
          <article key={character.id} className="flex flex-col gap-3 rounded-2xl border border-divider/50 bg-bg-card p-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-bold">{character.name}</p>
              <p className="text-xs text-secondary-text">
                {character.isCustom ? "Tùy chỉnh" : "Mặc định"} · {character.isPublic ? "Public" : "Riêng"} · {character.moderationStatus} · {character.user?.email || "hệ thống"}
              </p>
            </div>
            <CharacterActions character={character} />
          </article>
        ))}
      </div>
    </div>
  );
}
