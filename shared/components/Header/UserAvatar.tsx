import Image from "next/image";

export default function UserAvatar() {
  return (
    <div className="relative h-10 w-10 overflow-hidden rounded-full">
      <Image
        src="/anime/hanako.jpg"
        alt="User Avatar"
        fill
        sizes="40px"
        className="object-cover"
      />
    </div>
  );
}