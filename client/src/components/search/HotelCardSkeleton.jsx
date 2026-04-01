import React from "react";
import Skeleton from "../ui/Skeleton.jsx";

function HotelCardSkeleton() {
  return (
    <div className="rounded-2xl bg-white shadow-soft border border-slate-100 overflow-hidden">
      <Skeleton className="h-40 w-full" />
      <div className="p-4 space-y-3">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="h-3 w-1/2" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-20 rounded-full" />
          <Skeleton className="h-8 w-20 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export default HotelCardSkeleton;

