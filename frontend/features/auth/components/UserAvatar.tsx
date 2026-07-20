import Image from "next/image";
import type { User } from "../types/auth";
import { User as UserIcon } from "lucide-react";

interface UserAvatarProps {
  user: User | null;
  size?: number;
}

export default function UserAvatar({ user, size = 50 }: UserAvatarProps) {
  if (!user) {
    return (
      <div
        className="flex items-center justify-center rounded-full bg-zinc-800 border border-zinc-700"
        style={{ width: size, height: size }}
      >
        <UserIcon className="h-4 w-4 text-zinc-400" />
      </div>
    );
  }

  return (
    <div
      className="relative shrink-0 overflow-hidden rounded-full"
      style={{ width: size, height: size }}
    >
      <Image
        src={user.avatar}
        alt={user.username}
        fill
        sizes={`${size}px`}
        className="object-cover"
      />
    </div>
  );
}
