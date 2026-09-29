"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

async function post(url, body) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Thao tác thất bại");
}

export function UserActions({ user }) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function run(action, plan) {
    setPending(true);
    setError("");
    try {
      await post("/api/admin/users", { userId: user.id, action, plan, reason });
      setReason("");
      router.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 min-w-52">
      <input
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        placeholder="Lý do"
        className="bg-bg-page border border-divider rounded px-2 py-1 text-xs"
      />
      <div className="flex flex-wrap gap-1">
        <button type="button" disabled={pending} onClick={() => run("set_plan", user.plan === "unlimited" ? "free" : "unlimited")} className="px-2 py-1 rounded bg-primary text-white text-[11px] font-bold">
          {user.plan === "unlimited" ? "Về Free" : "Cho Unlimited"}
        </button>
        <button type="button" disabled={pending} onClick={() => run(user.disabledAt ? "enable" : "disable")} className="px-2 py-1 rounded border border-divider text-[11px] font-bold">
          {user.disabledAt ? "Mở khóa" : "Khóa"}
        </button>
      </div>
      {error && <p className="text-[11px] text-red-400">{error}</p>}
    </div>
  );
}

export function CharacterActions({ character }) {
  const router = useRouter();
  const [note, setNote] = useState(character.moderationNote || "");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const hidden = character.moderationStatus === "hidden";

  async function run(action) {
    if (action === "delete" && !window.confirm(`Xóa ${character.name}? Mọi cuộc trò chuyện với nhân vật này cũng bị xóa.`)) return;
    setPending(true);
    setError("");
    try {
      await post("/api/admin/characters", { characterId: character.id, action, note });
      router.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 min-w-44">
      <input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Ghi chú" className="bg-bg-page border border-divider rounded px-2 py-1 text-xs" />
      <div className="flex flex-wrap gap-1">
        <button type="button" disabled={pending} onClick={() => run(hidden ? "show" : "hide")} className="px-2 py-1 rounded bg-primary text-white text-[11px] font-bold">
          {hidden ? "Hiện" : "Ẩn"}
        </button>
        {character.isCustom && (
          <button type="button" disabled={pending} onClick={() => run("delete")} className="px-2 py-1 rounded border border-red-500/40 text-red-400 text-[11px] font-bold">
            Xóa
          </button>
        )}
      </div>
      {error && <p className="text-[11px] text-red-400">{error}</p>}
    </div>
  );
}
