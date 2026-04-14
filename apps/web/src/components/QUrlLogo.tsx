import Image from "next/image";

interface QUrlLogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  className?: string;
}

const sizes = {
  sm: { img: 20, text: "text-base" },
  md: { img: 28, text: "text-xl" },
  lg: { img: 40, text: "text-3xl" },
};

export function QUrlLogo({
  size = "md",
  showText = true,
  className = "",
}: QUrlLogoProps) {
  const s = sizes[size];
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <Image
        src="/logo.svg"
        alt="Qurl"
        width={s.img}
        height={s.img}
        className="shrink-0"
      />
      {showText && (
        <span
          className={`${s.text} font-bold text-gray-900 dark:text-gray-100`}
        >
          Qurl
        </span>
      )}
    </span>
  );
}
