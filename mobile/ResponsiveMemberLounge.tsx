"use client";

import { MemberLounge } from "@/components/MemberLounge";
import { MemberNotification, type MemberNotificationData } from "@/components/MemberNotification";
import { MobileMemberLounge, type MobileMemberLoungeProps } from "@/mobile/MobileMemberLounge";
import { useIsMobile } from "@/mobile/useIsMobile";

export function ResponsiveMemberLounge({ notification, ...props }: MobileMemberLoungeProps & { notification?: MemberNotificationData | null }) {
  const isMobile = useIsMobile();

  return (
    <>
      <MemberNotification notification={notification} />
      {isMobile ? <MobileMemberLounge {...props} /> : <MemberLounge {...props} />}
    </>
  );
}
