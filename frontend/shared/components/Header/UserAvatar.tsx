import Image from "next/image";

export default function UserAvatar() {
  return (
    <div className="relative h-13 w-13 overflow-hidden rounded-full">
      <Image
        src="/animesection/10.jpg"
        alt="User Avatar"
        fill
        sizes="40px"
        className="object-cover"
      />
    </div>
  );
}