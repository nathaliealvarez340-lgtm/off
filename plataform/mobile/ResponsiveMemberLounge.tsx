"use client";

import { MemberLounge } from "@/components/MemberLounge";
import { MobileMemberLounge, type MobileMemberLoungeProps } from "@/mobile/MobileMemberLounge";
import { useIsMobile } from "@/mobile/useIsMobile";

export function ResponsiveMemberLounge(props: MobileMemberLoungeProps) {
  const isMobile = useIsMobile();

  return isMobile ? <MobileMemberLounge {...props} /> : <MemberLounge {...props} />;
}
