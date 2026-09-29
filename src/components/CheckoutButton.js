"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function CheckoutButton({ configured, currentPlan }) {
  const { status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function buy() {
    if (status !== "authenticated") {
      router.push("/login?callbackUrl=/pricing");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: "unlimited" }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Không tạo được đơn thanh toán");
      const form = document.createElement("form");
      form.method = "POST";
      form.action = data.checkoutUrl;
      Object.entries(data.fields || {}).forEach(([name, value]) => {
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = name;
        input.value = value;
        form.appendChild(input);
      });
      document.body.appendChild(form);
      form.submit();
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  if (currentPlan === "unlimited") {
    return <p className="text-xs font-bold text-primary">Bạn đang dùng Unlimited.</p>;
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={buy}
        disabled={!configured || loading}
        className="w-full py-3 rounded-full text-xs font-bold bg-primary text-white disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Đang chuyển sang SePay..." : configured ? "Mua gói Unlimited" : "Chưa cấu hình SePay"}
      </button>
      {error && <p className="text-[11px] text-red-400">{error}</p>}
    </div>
  );
}
